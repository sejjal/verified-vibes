import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import TranscriptInput from "@/components/TranscriptInput";
import FactCard from "@/components/FactCard";
import SocialExport from "@/components/SocialExport";
import type { Claim } from "@/types/claims";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (transcript: string) => {
    setIsLoading(true);
    setClaims([]);

    try {
      const { data, error } = await supabase.functions.invoke("verify-claims", {
        body: { transcript },
      });

      if (error) throw error;

      if (data?.claims && Array.isArray(data.claims)) {
        setClaims(data.claims);
        toast.success(`Found and verified ${data.claims.length} claims`);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error(err.message || "Failed to verify transcript. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="px-6 md:px-12 pb-20 space-y-8">
          <TranscriptInput onSubmit={handleVerify} isLoading={isLoading} />

          <AnimatePresence>
            {claims.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-3xl mx-auto space-y-8"
              >
                <div>
                  <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 px-1">
                    Fact Check Results
                  </h2>
                  <div className="space-y-4">
                    {claims.map((claim, i) => (
                      <FactCard key={i} claim={claim} index={i} />
                    ))}
                  </div>
                </div>

                <SocialExport claims={claims} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Index;
