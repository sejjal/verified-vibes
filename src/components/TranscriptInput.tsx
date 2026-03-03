import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TranscriptInputProps {
  onSubmit: (transcript: string) => void;
  isLoading: boolean;
}

const TranscriptInput = ({ onSubmit, isLoading }: TranscriptInputProps) => {
  const [transcript, setTranscript] = useState("");

  const handleSubmit = () => {
    if (transcript.trim().length > 20) {
      onSubmit(transcript.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="glass rounded-2xl p-6 md:p-8">
        <label className="block text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
          Paste Transcript
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste a video transcript here and we'll identify and verify the key factual claims..."
          className="w-full h-48 bg-secondary/50 border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-sans"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground font-mono">
            {transcript.length > 0 ? `${transcript.length} chars` : "Min 20 characters"}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || transcript.trim().length <= 20}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 gap-2 rounded-xl transition-all disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Verify Transcript
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default TranscriptInput;
