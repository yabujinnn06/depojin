import { ReactNode } from "react";
import { cn } from "../../lib/cn";

export default function ShineCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[14px] bg-card border border-edge",
      "before:absolute before:inset-0 before:pointer-events-none",
      "before:bg-[linear-gradient(110deg,transparent_40%,rgba(191,143,111,0.18)_50%,transparent_60%)]",
      "before:bg-[length:220%_100%] before:animate-shine",
      className,
    )}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
