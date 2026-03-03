import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    if (!transcript || transcript.length < 20) {
      return new Response(
        JSON.stringify({ error: "Transcript too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a fact-checking AI. Given a transcript, you must:
1. Extract exactly 3 specific, verifiable factual claims from the text.
2. For each claim, assess its truthfulness based on your knowledge (use the most recent data available, especially 2025-2026 data).
3. Provide a verdict: "Verified" (claim is accurate), "Exaggerated" (partially true but misleading), or "False" (claim is incorrect).
4. Write a concise evidence summary (1-2 sentences) explaining your assessment.
5. Provide a relevant source URL when possible (use reputable sources like Wikipedia, Reuters, government sites, etc.).

You MUST respond using the suggest_claims tool. Do not write any other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the transcript to fact-check:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_claims",
              description: "Return exactly 3 fact-checked claims from the transcript.",
              parameters: {
                type: "object",
                properties: {
                  claims: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_claim: { type: "string", description: "The exact claim extracted from the transcript" },
                        verdict: { type: "string", enum: ["Verified", "Exaggerated", "False"] },
                        evidence_summary: { type: "string", description: "1-2 sentence summary of evidence" },
                        source_url: { type: "string", description: "URL to a reputable source" },
                      },
                      required: ["original_claim", "verdict", "evidence_summary", "source_url"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["claims"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_claims" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ claims: parsed.claims }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-claims error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
