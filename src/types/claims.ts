export interface Claim {
  original_claim: string;
  verdict: "Verified" | "Exaggerated" | "False";
  evidence_summary: string;
  source_url: string;
}
