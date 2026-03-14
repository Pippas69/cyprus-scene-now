import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    .map((t, i) => ({
      label: normalizeLabel(t.label, `${i + 1}`),
      seats: clamp(Math.round(toNumber(t.seats, 4)), 1, 20),
      shape: typeof t.shape === "string" && ALLOWED_TABLE_SHAPES.has(t.shape) ? t.shape : "square",
      x_percent: clamp(toNumber(t.x_percent, 50), 0, 100),
      y_percent: clamp(toNumber(t.y_percent, 50), 0, 100),
      width_percent: clamp(toNumber(t.width_percent, 4), 1.5, 15),
      height_percent: clamp(toNumber(t.height_percent, 4), 1.5, 15),
    }));

  // Deduplicate tables at same position (within 1.5% threshold)
  const dedupedTables: NormalizedTable[] = [];
  for (const table of normTables) {
    const duplicate = dedupedTables.find(
      (t) => Math.abs(t.x_percent - table.x_percent) < 1.5 && Math.abs(t.y_percent - table.y_percent) < 1.5
    );
    if (!duplicate) dedupedTables.push(table);
  }

  return { fixtures: normFixtures, tables: dedupedTables };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert venue floor plan transcription engine. You must extract EVERY SINGLE labeled object visible in the floor plan image with PRECISE bounding boxes.

Return TWO arrays:

1. "fixtures" — non-seating structural elements like bars, DJ booths, stages, entrances.
   Each has: label, fixture_type (bar|dj|stage|entrance|kitchen|restroom|other), x_percent, y_percent, width_percent, height_percent.

2. "tables" — EVERY individual table, booth, or seating position visible in the image.
   Each has: label, seats, shape (round|square|rectangle), x_percent, y_percent, width_percent, height_percent.
   - width_percent and height_percent represent the ACTUAL SIZE of the table as a percentage of the image.
   - Small square tables should have width ≈ 3-5%, height ≈ 3-5%.
   - Narrow/thin tables (like booth numbers along a wall) should have width ≈ 2-4%, height ≈ 2-3% (or vice versa).
   - The shape and proportions MUST match what you see in the image.

CRITICAL EXTRACTION RULES:
- Coordinates are ABSOLUTE percentages of the image (0=top/left, 100=bottom/right).
- x_percent and y_percent are the TOP-LEFT corner of the object's bounding box.
- PRESERVE the EXACT label/number from the image: "1", "2", "P1", "101", "Bar 1", etc.
- You MUST extract EVERY labeled item. If you see numbers 1 through 10, that's 10 separate table entries.
- If you see labels like P1, P2, P3... P9, that's 9 separate entries.
- If you see labels like 101, 102... 110, that's 10 separate entries.
- If you see labels like 20, 21, 22... 29, that's 10 separate entries.
- Tables typically have 2-6 seats. Use 4 as default if unclear.
- IMPORTANT: Look at the ACTUAL SHAPE of each table in the image. Most are square. Use "rectangle" only for clearly elongated shapes.
- Do NOT group or merge tables. Each labeled point = one entry.
- Do NOT skip ANY visible labeled object. Count them carefully.
- Scan the ENTIRE image systematically: top-left to bottom-right.`;

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
              { type: "text", text: "Extract EVERY labeled object from this floor plan with precise bounding boxes (x, y, width, height as percentages). The width and height should match the actual visual size of each element. Scan the entire image carefully. Return ALL of them." },
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-floor-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
