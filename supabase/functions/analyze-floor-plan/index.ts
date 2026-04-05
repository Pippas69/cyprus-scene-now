import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

type RawFixture = {
  label?: string;
  fixture_type?: string;
  x_percent?: number;
  y_percent?: number;
  width_percent?: number;
  height_percent?: number;
};

type RawTable = {
  label?: string;
  seats?: number;
  shape?: string;
  x_percent?: number;
  y_percent?: number;
  width_percent?: number;
  height_percent?: number;
};

const ALLOWED_FIXTURE_TYPES = new Set(["bar", "dj", "stage", "entrance", "kitchen", "restroom", "other"]);
const ALLOWED_TABLE_SHAPES = new Set(["round", "square", "rectangle"]);

const toNumber = (value: unknown, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeLabel = (value: unknown, fallback: string) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text.slice(0, 42) : fallback;
};

const normalizeTableLabel = (value: unknown, fallback: string) => {
  const base = normalizeLabel(value, fallback).replace(/\s+/g, "");

  const pMatch = base.match(/^[pP](\d{1,3})$/);
  if (pMatch) return `P${pMatch[1]}`;

  // OCR συχνά διαβάζει το P ως n
  const nMatch = base.match(/^[nN](\d{1,3})$/);
  if (nMatch) return `P${nMatch[1]}`;

  return base;
};

const inferShapeFromBox = (shape: unknown, widthPercent: number, heightPercent: number) => {
  if (shape === "round") return "round";
  const ratio = widthPercent / Math.max(heightPercent, 0.01);
  return ratio > 1.35 || ratio < 0.74 ? "rectangle" : "square";
};

interface NormalizedFixture {
  label: string;
  fixture_type: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

interface NormalizedTable {
  label: string;
  seats: number;
  shape: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

const normalizeResult = (fixtures: RawFixture[], tables: RawTable[]) => {
  const normFixtures: NormalizedFixture[] = fixtures
    .filter(Boolean)
    .slice(0, 30)
    .map((f, i) => ({
      label: normalizeLabel(f.label, `Fixture ${i + 1}`),
      fixture_type: typeof f.fixture_type === "string" && ALLOWED_FIXTURE_TYPES.has(f.fixture_type) ? f.fixture_type : "other",
      x_percent: clamp(toNumber(f.x_percent, 0), 0, 100),
      y_percent: clamp(toNumber(f.y_percent, 0), 0, 100),
      width_percent: clamp(toNumber(f.width_percent, 8), 3, 60),
      height_percent: clamp(toNumber(f.height_percent, 5), 2, 40),
    }));

  const normTables: NormalizedTable[] = tables
    .filter(Boolean)
    .slice(0, 200)
    .map((t, i) => {
      const widthPercent = clamp(toNumber(t.width_percent, 4), 1.2, 18);
      const heightPercent = clamp(toNumber(t.height_percent, 4), 1.2, 18);

      return {
        label: normalizeTableLabel(t.label, `${i + 1}`),
        seats: clamp(Math.round(toNumber(t.seats, 4)), 1, 20),
        shape: inferShapeFromBox(t.shape, widthPercent, heightPercent),
        x_percent: clamp(toNumber(t.x_percent, 50), 0, 100),
        y_percent: clamp(toNumber(t.y_percent, 50), 0, 100),
        width_percent: widthPercent,
        height_percent: heightPercent,
      };
    });

  // Stabilize geometry for repeated label families (e.g. P1..P9, 101..110)
  const harmonizeGroup = (matcher: (label: string) => boolean) => {
    const group = normTables.filter((t) => matcher(t.label));
    if (group.length < 3) return;

    const sortedW = group.map((g) => g.width_percent).sort((a, b) => a - b);
    const sortedH = group.map((g) => g.height_percent).sort((a, b) => a - b);
    const medianW = sortedW[Math.floor(sortedW.length / 2)];
    const medianH = sortedH[Math.floor(sortedH.length / 2)];

    for (const table of normTables) {
      if (!matcher(table.label)) continue;
      table.width_percent = clamp(table.width_percent * 0.35 + medianW * 0.65, 1.2, 18);
      table.height_percent = clamp(table.height_percent * 0.35 + medianH * 0.65, 1.2, 18);
      table.shape = inferShapeFromBox(table.shape, table.width_percent, table.height_percent);
    }
  };

  harmonizeGroup((label) => /^P\d{1,3}$/i.test(label));
  harmonizeGroup((label) => /^10\d$/.test(label));

  // Deduplicate only truly overlapping duplicates (stricter than before)
  const dedupedTables: NormalizedTable[] = [];
  for (const table of normTables) {
    const duplicate = dedupedTables.find((t) => {
      const sameLabel = t.label.toLowerCase() === table.label.toLowerCase();
      const veryClose = Math.abs(t.x_percent - table.x_percent) < 0.55 && Math.abs(t.y_percent - table.y_percent) < 0.55;
      const similarSize = Math.abs(t.width_percent - table.width_percent) < 0.9 && Math.abs(t.height_percent - table.height_percent) < 0.9;
      return sameLabel || (veryClose && similarSize);
    });

    if (!duplicate) dedupedTables.push(table);
  }

  return { fixtures: normFixtures, tables: dedupedTables };
};

const BodySchema = z.object({
  imageBase64: z.string().min(100).max(10_000_000),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders });

  try {
    const { imageBase64 } = await parseBody(req, BodySchema);
    if (!imageBase64) throw new Error("No image provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a professional venue floor plan digitization engine that produces PIXEL-PERFECT transcriptions. Your output will be rendered as an interactive SVG blueprint overlay — accuracy is critical.

COORDINATE SYSTEM:
- All values are PERCENTAGES of the full image (0 = top/left edge, 100 = bottom/right edge).
- x_percent, y_percent = TOP-LEFT corner of each element's bounding box.
- Measure coordinates by examining where each element STARTS (top-left pixel) relative to the full image dimensions.

BOUNDING BOX ACCURACY — THIS IS THE MOST CRITICAL REQUIREMENT:
- You MUST measure the ACTUAL pixel dimensions of each element as rendered in the image.
- Convert pixel measurements to percentages: (element_pixels / image_total_pixels) × 100.
- A bar counter spanning half the image width = width_percent ≈ 50, NOT 20.
- A small table label occupying roughly 3% of image width = width_percent ≈ 3-4.
- Narrow booth-style seating stacked vertically: each is wide but short (e.g., width 6%, height 2%).
- The ASPECT RATIO of each element must precisely match the visual. If something is 3× wider than tall, width must be 3× height.
- Do NOT normalize or equalize sizes. Each element has its own unique measured dimensions.

FIXTURE TYPES:
- "bar" = bar counters, bars labeled BAR, BAR 1, BAR 2, etc.
- "dj" = DJ booth
- "stage" = stage, performance area
- "entrance" = entry points
- "kitchen" = kitchen area
- "restroom" = WC, toilets
- "other" = any other non-seating structural element (walls, columns, etc.)

TABLE EXTRACTION:
- Extract EVERY individually labeled table/seat position.
- Preserve EXACT labels from the image: "1", "2", "P1", "P2", "101", "102" etc.
- If OCR reads "n1", "n2"... these are likely "P1", "P2" — correct to P.
- Default seats = 4 unless label or context suggests otherwise.
- SHAPES: Look at the ACTUAL drawn shape. "round" = circle/oval. "square" = roughly equal sides. "rectangle" = clearly longer in one dimension.
- If tables appear grouped in a line/column with similar sizes, measure ONE precisely and apply consistent sizing to all in that group.

SYSTEMATIC SCANNING:
1. Scan TOP-LEFT to BOTTOM-RIGHT in a grid pattern.
2. Then scan BOTTOM-RIGHT to TOP-LEFT to catch missed items.
3. Count extracted items. Compare with visible labels. Add any missing.
4. Final verification: ensure no two items have identical coordinates (they would overlap).

SPACING ACCURACY:
- Pay special attention to the GAPS between tables. If tables are tightly packed, their coordinates should reflect that.
- If a column of tables (e.g., 101-110) spans from y=8% to y=85%, distribute them evenly across that range.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Digitize this floor plan with PIXEL-PERFECT accuracy. Measure each element's actual position and size as percentages of the image. The output will be rendered as an interactive SVG — positions and proportions must match the original image exactly. Extract ALL labeled objects. Correct OCR errors (n→P for table labels). Return via the return_floor_plan function." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_floor_plan",
              description: "Return extracted floor plan as fixtures (non-seating) and tables (seating points) with precise bounding boxes.",
              parameters: {
                type: "object",
                properties: {
                  fixtures: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        fixture_type: { type: "string", enum: ["bar", "dj", "stage", "entrance", "kitchen", "restroom", "other"] },
                        x_percent: { type: "number" },
                        y_percent: { type: "number" },
                        width_percent: { type: "number" },
                        height_percent: { type: "number" },
                      },
                      required: ["label", "fixture_type", "x_percent", "y_percent", "width_percent", "height_percent"],
                      additionalProperties: false,
                    },
                  },
                  tables: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        seats: { type: "number" },
                        shape: { type: "string", enum: ["round", "square", "rectangle"] },
                        x_percent: { type: "number" },
                        y_percent: { type: "number" },
                        width_percent: { type: "number" },
                        height_percent: { type: "number" },
                      },
                      required: ["label", "seats", "shape", "x_percent", "y_percent", "width_percent", "height_percent"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["fixtures", "tables"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_floor_plan" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;

    let rawFixtures: RawFixture[] = [];
    let rawTables: RawTable[] = [];
    const toolArgs = message?.tool_calls?.[0]?.function?.arguments;

    if (toolArgs) {
      const parsed = JSON.parse(toolArgs);
      rawFixtures = Array.isArray(parsed?.fixtures) ? parsed.fixtures : [];
      rawTables = Array.isArray(parsed?.tables) ? parsed.tables : [];
    } else {
      let content = message?.content || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(content);
      rawFixtures = Array.isArray(parsed?.fixtures) ? parsed.fixtures : [];
      rawTables = Array.isArray(parsed?.tables) ? parsed.tables : [];
    }

    const result = normalizeResult(rawFixtures, rawTables);

    return new Response(JSON.stringify(result), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    console.error("analyze-floor-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});
