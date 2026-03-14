import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert floor plan analyzer for restaurants, bars, and nightclubs. 
Analyze the uploaded floor plan image and extract the layout into structured JSON.

You must identify:
1. ZONES - distinct areas like VIP sections, bar area, lounge, stage, DJ booth, outdoor area, main floor, etc.
2. TABLES - individual tables/seating spots within each zone.

For each zone, estimate its position on the image as percentages (0-100) of width and height.
For each table within a zone, estimate its relative position within the zone.

Zone types must be one of: vip, table, bar, stage, dj, lounge, other

Table shapes must be one of: round, square, rectangle

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "zones": [
    {
      "label": "VIP Area",
      "zone_type": "vip",
      "x_percent": 10,
      "y_percent": 15,
      "width_percent": 25,
      "height_percent": 30,
      "capacity": 20,
      "tables": [
        {
          "label": "T1",
          "seats": 4,
          "shape": "round",
          "x_percent": 25,
          "y_percent": 30
        }
      ]
    }
  ]
}

Important rules:
- x_percent and y_percent for zones are absolute positions on the canvas (0-100)
- x_percent and y_percent for tables are ALSO absolute positions on the canvas (0-100), NOT relative to the zone
- width_percent and height_percent for zones define the zone's size as percentage of canvas
- Make zones large enough to contain their tables
- Don't overlap zones excessively
- Estimate realistic seat counts based on the visual layout
- Label tables with short names like T1, T2 or VIP1, VIP2
- If you can't clearly identify individual tables, create reasonable estimates based on the zone size and capacity
- Capacity of a zone = sum of seats of all tables in that zone`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this floor plan image and extract all zones and tables into structured JSON." },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI returned invalid JSON. Please try again.");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-floor-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
