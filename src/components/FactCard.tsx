import { CheckCircle2, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { Claim } from "@/types/claims";

const verdictConfig = {
  Verified: {
    icon: CheckCircle2,
    colorClass: "text-verified",
    bgClass: "bg-verified/10 border-verified/30",
    glowClass: "glow-verified",
    label: "Verified",
  },
  Exaggerated: {
    icon: AlertTriangle,
    colorClass: "text-exaggerated",
    bgClass: "bg-exaggerated/10 border-exaggerated/30",
    glowClass: "glow-exaggerated",
    label: "Exaggerated",
  },
  False: {
    icon: XCircle,
    colorClass: "text-false",
    bgClass: "bg-false/10 border-false/30",
    glowClass: "glow-false",
    label: "False",
  },
};

interface FactCardProps {
  claim: Claim;
  index: number;
}

const FactCard = ({ claim, index }: FactCardProps) => {
  const config = verdictConfig[claim.verdict];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.15 }}
      className={`glass rounded-2xl p-6 ${config.glowClass}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl border ${config.bgClass} shrink-0`}>
          <Icon className={`w-5 h-5 ${config.colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${config.colorClass}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm font-mono text-foreground/90 mb-3 leading-relaxed">
            "{claim.original_claim}"
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {claim.evidence_summary}
          </p>
          {claim.source_url && (
            <a
              href={claim.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-mono transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Source
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default FactCard;
