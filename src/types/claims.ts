export interface Claim {
  original_claim: string;
  verdict: "Verified" | "Exaggerated" | "False";
  evidence_summary: string;
  source_url: string;
  confidence: number;
}

export type ContentType =
  | "Podcast"
  | "Standup Comedy"
  | "News Report"
  | "Interview"
  | "Speech"
  | "Debate"
  | "Lecture"
  | "Other";

export interface VerificationResult {
  content_type: ContentType;
  content_summary: string;
  claims: Claim[];
}
