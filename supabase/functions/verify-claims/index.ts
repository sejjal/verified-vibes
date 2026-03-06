import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTENT_TYPES = [
  "Podcast",
  "Standup Comedy",
  "News Report",
  "Interview",
  "Speech",
  "Debate",
  "Lecture",
  "Other",
] as const;

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

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

    const looksLikeLinkOnly = /https?:\/\//i.test(transcript) && transcript.trim().split(/\s+/).length < 15;
    if (looksLikeLinkOnly) {
      return new Response(
        JSON.stringify({ error: "Please paste transcript text (not just a link) so claims can be verified accurately." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a rigorous, skeptical fact-checking AI analyst. Your goal is to find false or misleading claims, but ONLY from the provided transcript text.

Rules you must follow:
1) Use ONLY information explicitly stated in the transcript. Never invent, infer, or add claims that are not present.
2) Extract EVERY verifiable factual claim from the transcript (not only 3).
3) If the transcript has no verifiable factual claims, return claims as an empty array [].
4) original_claim must be a verbatim quote from the transcript.
5) Be extra skeptical with numbers, dates, and statistics. If anything is off, use Exaggerated or False.

Return:
- content_type: one of Podcast, Standup Comedy, News Report, Interview, Speech, Debate, Lecture, Other
- content_summary: 1-2 sentence summary
- claims: array of objects with original_claim, verdict (Verified | Exaggerated | False), evidence_summary (2-3 sentences), source_url (real working URL), confidence (0.0-1.0)

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
                    description: "All verifiable factual claims found in the transcript. Can be empty when none are present.",
                    items: {
                      type: "object",
                      properties: {
                        original_claim: { type: "string", description: "Exact verbatim quote from the transcript" },
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
    const transcriptNormalized = normalizeText(transcript);

    const safeClaims = Array.isArray(parsed?.claims)
      ? parsed.claims.filter((claim: any) => {
          if (!claim || typeof claim.original_claim !== "string") return false;
          const claimNormalized = normalizeText(claim.original_claim);
          if (!claimNormalized) return false;
          return transcriptNormalized.includes(claimNormalized);
        })
      : [];

    const safeContentType = CONTENT_TYPES.includes(parsed?.content_type)
      ? parsed.content_type
      : "Other";

    const safeSummary =
      typeof parsed?.content_summary === "string" && parsed.content_summary.trim().length > 0
        ? parsed.content_summary
        : safeClaims.length === 0
          ? "No verifiable factual claims were explicitly found in the provided transcript text."
          : "";

    return new Response(
      JSON.stringify({
        content_type: safeContentType,
        content_summary: safeSummary,
        claims: safeClaims,
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
