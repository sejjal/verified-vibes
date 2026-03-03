import { Search } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full py-6 px-6 md:px-12">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-primary">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Truth<span className="text-gradient">Lens</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase">
              Verify the Vibes
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <div className="w-2 h-2 rounded-full bg-verified animate-pulse-glow" />
          AI-Powered Fact Checking
        </div>
      </div>
    </header>
  );
};

export default Header;
