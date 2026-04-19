import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cpiData = {
  ELECTRONICS: { index: 87.5, annualChange: -12.5 },
  CLOTHING: { index: 101.2, annualChange: 1.2 },
  FURNITURE: { index: 94.1, annualChange: -5.9 },
  TEXTBOOKS: { index: 103.7, annualChange: 3.7 },
  OTHER: { index: 103.6, annualChange: 3.6 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    const body = await req.text();
    console.log("Raw body received:", body);

    if (!body) {
      return new Response(JSON.stringify({ error: "Empty body" }), { status: 400 });
    }

    const { title, description, category } = JSON.parse(body);
    const cpi = cpiData[category] || cpiData.OTHER;

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [{
          role: "user",
          content: `You are a South African student marketplace pricing assistant.
Use the following official Stats SA CPI data (P0141, December 2025, base Dec 2024=100):

Category: ${category}
CPI Index: ${cpi.index}
Annual price change: ${cpi.annualChange}%

Suggest a second-hand price range in ZAR for:
Title: ${title}
Description: ${description}

Reply ONLY with JSON: {"min": number, "max": number, "reason": string}`
        }]
      })
    });

    const rawText = await openRouterRes.text();
    console.log("OpenRouter status:", openRouterRes.status);
    console.log("OpenRouter response:", rawText);

    if (!openRouterRes.ok) {
      return new Response(
        JSON.stringify({ error: "OpenRouter failed", details: rawText }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const data = JSON.parse(rawText);
    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();

    return new Response(clean, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (err) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});