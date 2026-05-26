import { cn } from "../../lib/cn";

type Props = {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
};

export default function BorderBeam({
  className,
  size = 200,
  duration = 4,
  colorFrom = "#BF6F34",
  colorTo  = "#FFD6A8",
}: Props) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden", className)}>
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          padding: "1px",
          background: `conic-gradient(from 0deg, transparent 0deg, ${colorFrom} 30deg, ${colorTo} 60deg, transparent 90deg)`,
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          animation: `border-beam-rotate ${duration}s linear infinite`,
        }}
      />
      <style>{`
        @keyframes border-beam-rotate { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
