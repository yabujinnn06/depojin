import { cn } from "../../lib/cn";

export default function ScanPulse({ active, className }: { active: boolean; className?: string }) {
  if (!active) return null;
  return (
    <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-center", className)}>
      <span className="absolute h-3 w-3 rounded-full bg-accent/70" />
      <span className="absolute h-3 w-3 rounded-full bg-accent/40 animate-pulse-ring" />
      <span className="absolute h-3 w-3 rounded-full bg-accent/20 animate-pulse-ring" style={{ animationDelay: "0.6s" }} />
    </div>
  );
}
