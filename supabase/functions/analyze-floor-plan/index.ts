import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RawTable = {
  label?: string;
  seats?: number;
  shape?: string;
  x_percent?: number;
  y_percent?: number;
};

type RawZone = {
  label?: string;
  zone_type?: string;
  x_percent?: number;
  y_percent?: number;
  width_percent?: number;
  height_percent?: number;
  capacity?: number;
  tables?: RawTable[];
};

const ALLOWED_ZONE_TYPES = new Set(["vip", "table", "bar", "stage", "dj", "lounge", "other"]);
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

const normalizeFloorPlan = (zonesInput: RawZone[]) => {
  const zones = zonesInput
    .filter(Boolean)
    .slice(0, 60)
    .map((zone, zIndex) => {
      const zoneType = typeof zone.zone_type === "string" && ALLOWED_ZONE_TYPES.has(zone.zone_type)
        ? zone.zone_type
        : "other";

      const x = clamp(toNumber(zone.x_percent, 0), 0, 100);
      const y = clamp(toNumber(zone.y_percent, 0), 0, 100);
      const width = clamp(toNumber(zone.width_percent, 15), 6, 96);
      const height = clamp(toNumber(zone.height_percent, 15), 6, 96);

      const right = Math.min(100, x + width);
      const bottom = Math.min(100, y + height);
      const fixedWidth = Math.max(6, right - x);
      const fixedHeight = Math.max(6, bottom - y);

      const tables = (Array.isArray(zone.tables) ? zone.tables : [])
        .slice(0, 160)
        .map((table, tIndex) => {
          const seats = clamp(Math.round(toNumber(table.seats, 4)), 1, 20);
          const shape = typeof table.shape === "string" && ALLOWED_TABLE_SHAPES.has(table.shape)
            ? table.shape
            : "round";

          const txRaw = clamp(toNumber(table.x_percent, x + fixedWidth / 2), 0, 100);
          const tyRaw = clamp(toNumber(table.y_percent, y + fixedHeight / 2), 0, 100);

          // Keep tables inside zone bounds for better assignment UX
          const tx = clamp(txRaw, x + 0.8, x + fixedWidth - 0.8);
          const ty = clamp(tyRaw, y + 0.8, y + fixedHeight - 0.8);

          return {
            label: normalizeLabel(table.label, `T${tIndex + 1}`),
            seats,
            shape,
            x_percent: tx,
            y_percent: ty,
          };
        });

      const capacityFromTables = tables.reduce((sum, table) => sum + table.seats, 0);
      const fallbackCapacity = clamp(Math.round(toNumber(zone.capacity, capacityFromTables || 4)), 0, 600);

      return {
        label: normalizeLabel(zone.label, `Zone ${zIndex + 1}`),
        zone_type: zoneType,
        x_percent: x,
        y_percent: y,
        width_percent: fixedWidth,
        height_percent: fixedHeight,
        capacity: capacityFromTables > 0 ? capacityFromTables : fallbackCapacity,
        tables,
      };
    })
    .sort((a, b) => (a.y_percent - b.y_percent) || (a.x_percent - b.x_percent));

  if (zones.length === 0) return [];

  // Normalize overall footprint so plan uses canvas space consistently (bigger + clearer)
  const minX = Math.min(...zones.map((zone) => zone.x_percent));
  const minY = Math.min(...zones.map((zone) => zone.y_percent));
  const maxX = Math.max(...zones.map((zone) => zone.x_percent + zone.width_percent));
  const maxY = Math.max(...zones.map((zone) => zone.y_percent + zone.height_percent));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const targetPadding = 4;
  const targetSpan = 100 - targetPadding * 2;
  const scale = Math.min(targetSpan / spanX, targetSpan / spanY, 2.2);

  const scaledSpanX = spanX * scale;
  const scaledSpanY = spanY * scale;
  const offsetX = (100 - scaledSpanX) / 2 - minX * scale;
  const offsetY = (100 - scaledSpanY) / 2 - minY * scale;

  return zones.map((zone) => {
    const newX = clamp(zone.x_percent * scale + offsetX, 0, 100);
    const newY = clamp(zone.y_percent * scale + offsetY, 0, 100);
    const newWidth = clamp(zone.width_percent * scale, 6, 98);
    const newHeight = clamp(zone.height_percent * scale, 6, 98);
    const safeX = clamp(newX, 0, 100 - newWidth);
    const safeY = clamp(newY, 0, 100 - newHeight);

    const tables = zone.tables.map((table) => {
      const txScaled = clamp(table.x_percent * scale + offsetX, 0, 100);
      const tyScaled = clamp(table.y_percent * scale + offsetY, 0, 100);
      return {
        ...table,
        x_percent: clamp(txScaled, safeX + 0.8, safeX + newWidth - 0.8),
        y_percent: clamp(tyScaled, safeY + 0.8, safeY + newHeight - 0.8),
      };
    });

    const capacity = tables.reduce((sum, table) => sum + table.seats, 0) || zone.capacity;

    return {
      ...zone,
      x_percent: safeX,
      y_percent: safeY,
      width_percent: newWidth,
      height_percent: newHeight,
      capacity,
      tables,
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert venue floor plan extraction engine for restaurants, bars and clubs.

Your task is to TRANSCRIBE the exact visible layout from the uploaded floor plan image.
Do NOT redesign, simplify, beautify, or invent a new arrangement.
Keep relative geometry faithful to the source image.

Return zones and individual tables as structured data.

Rules:
- zone_type must be one of: vip, table, bar, stage, dj, lounge, other
- table shape must be one of: round, square, rectangle
- All coordinates are absolute percentages of the image canvas (0-100)
- width_percent and height_percent describe zone size in canvas percentages
- Tables must be placed inside their zone bounds
- If a table/booth has a visible number or label, preserve it in label
- Prefer many accurate tables over one vague large zone
- Capacity of each zone must equal sum of seats from its tables`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract zones and individual tables from this floor plan." },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_floor_plan",
              description: "Return extracted floor plan as structured zones with tables.",
              parameters: {
                type: "object",
                properties: {
                  zones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        zone_type: {
                          type: "string",
                          enum: ["vip", "table", "bar", "stage", "dj", "lounge", "other"],
                        },
                        x_percent: { type: "number" },
                        y_percent: { type: "number" },
                        width_percent: { type: "number" },
                        height_percent: { type: "number" },
                        capacity: { type: "number" },
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
                            },
                            required: ["label", "seats", "shape", "x_percent", "y_percent"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["label", "zone_type", "x_percent", "y_percent", "width_percent", "height_percent", "tables"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["zones"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "return_floor_plan" },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;

    let zonesInput: RawZone[] = [];
    const toolArgs = message?.tool_calls?.[0]?.function?.arguments;

    if (toolArgs) {
      const parsedTool = JSON.parse(toolArgs);
      zonesInput = Array.isArray(parsedTool?.zones) ? parsedTool.zones : [];
    } else {
      let content = message?.content || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsedContent = JSON.parse(content);
      zonesInput = Array.isArray(parsedContent?.zones) ? parsedContent.zones : [];
    }

    const normalizedZones = normalizeFloorPlan(zonesInput);

    return new Response(JSON.stringify({ zones: normalizedZones }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-floor-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
