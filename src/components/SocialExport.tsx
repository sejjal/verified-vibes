import { useState } from "react";
import { Copy, Check, Linkedin, Twitter } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Claim, ContentType } from "@/types/claims";

interface SocialExportProps {
  claims: Claim[];
  contentType?: ContentType | null;
}

const generateDraft = (claims: Claim[], platform: "linkedin" | "twitter", contentType?: ContentType | null) => {
  const emoji = { Verified: "✅", Exaggerated: "⚠️", False: "❌" };
  const lines = claims.map(
    (c) => `${emoji[c.verdict]} ${c.original_claim}\n→ ${c.evidence_summary}`
  );

  const typeLabel = contentType ? `this ${contentType.toLowerCase()}` : "this transcript";

  if (platform === "twitter") {
    return `🔍 Fact-checked ${typeLabel} with TruthLens:\n\n${lines.join("\n\n")}\n\n#FactCheck #TruthLens`;
  }
  return `🔍 I ran ${typeLabel} through TruthLens — here's what the data says:\n\n${lines.join("\n\n")}\n\nAlways verify the vibes. 🧠\n\n#FactCheck #TruthLens #CriticalThinking`;
};

const SocialExport = ({ claims, contentType }: SocialExportProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"linkedin" | "twitter">("linkedin");

  const draft = generateDraft(claims, platform, contentType);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Social Export
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={platform === "linkedin" ? "default" : "outline"}
              onClick={() => setPlatform("linkedin")}
              className="gap-1.5 text-xs rounded-lg"
            >
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </Button>
            <Button
              size="sm"
              variant={platform === "twitter" ? "default" : "outline"}
              onClick={() => setPlatform("twitter")}
              className="gap-1.5 text-xs rounded-lg"
            >
              <Twitter className="w-3.5 h-3.5" />
              X / Twitter
            </Button>
          </div>
        </div>
        <pre className="bg-secondary/50 border border-border rounded-xl p-4 text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
          {draft}
        </pre>
        <div className="flex justify-end mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5 text-xs rounded-lg"
          >
            {copied === platform ? (
              <>
                <Check className="w-3.5 h-3.5 text-verified" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Draft
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SocialExport;
