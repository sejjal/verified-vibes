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

    const systemPrompt = `You are a rigorous, skeptical fact-checking AI analyst. Your goal is to find EVERY factual claim and especially catch false or misleading ones. Given a transcript, you must:

1. IDENTIFY THE CONTENT TYPE: Options: "Podcast", "Standup Comedy", "News Report", "Interview", "Speech", "Debate", "Lecture", "Other".

2. PROVIDE A BRIEF SUMMARY: 1-2 sentences about the transcript.

3. EXTRACT **EVERY SINGLE** SPECIFIC, VERIFIABLE FACTUAL CLAIM from the text. Do NOT limit to 3 — extract ALL of them, even if there are 10, 15, or more. Include:
   - Statistics, numbers, dates, quantitative claims
   - Historical facts and events
   - Scientific or technical claims
   - Named entities and their attributes
   - Geographic, demographic, or economic claims
   - Any statement presented as fact
   - Do NOT pick opinions, jokes, or subjective statements

4. For each claim, RIGOROUSLY VERIFY with a SKEPTICAL eye. Assume claims might be wrong and actively look for errors:
   - verdict: "Verified", "Exaggerated", or "False"
   - evidence_summary: 2-3 sentences with the CORRECT data if the claim is wrong. Be specific.
   - source_url: A REAL URL to a reputable source (wikipedia.org, reuters.com, bbc.com, etc.)
   - confidence: 0.0 to 1.0

IMPORTANT: Be EXTRA skeptical. Double-check numbers, dates, and statistics carefully. If something seems slightly off, mark it as Exaggerated or False.

You MUST respond using the verify_transcript tool.`;

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
              name: "verify_transcript",
              description: "Return the content type, summary, and ALL rigorously fact-checked claims from the transcript.",
              parameters: {
                type: "object",
                properties: {
                  content_type: {
                    type: "string",
                    enum: ["Podcast", "Standup Comedy", "News Report", "Interview", "Speech", "Debate", "Lecture", "Other"],
                    description: "The type of content this transcript is from",
                  },
                  content_summary: {
                    type: "string",
                    description: "1-2 sentence summary of the transcript content and context",
                  },
                  claims: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_claim: { type: "string", description: "The exact claim extracted from the transcript" },
                        verdict: { type: "string", enum: ["Verified", "Exaggerated", "False"] },
                        evidence_summary: { type: "string", description: "2-3 sentences explaining the verdict with specific data and corrections if needed" },
                        source_url: { type: "string", description: "A real, working URL to a reputable source" },
                        confidence: { type: "number", description: "Confidence in the verdict from 0.0 to 1.0" },
                      },
                      required: ["original_claim", "verdict", "evidence_summary", "source_url", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["content_type", "content_summary", "claims"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_transcript" } },
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
      JSON.stringify({
        content_type: parsed.content_type,
        content_summary: parsed.content_summary,
        claims: parsed.claims,
      }),
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
