import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  cr?: number;
  className?: string;
  glow?: boolean;
}

export function DotPattern({
  width = 18,
  height = 18,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [dim, setDim] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const upd = () => {
      if (ref.current) {
        const r = ref.current.getBoundingClientRect();
        setDim({ width: r.width, height: r.height });
      }
    };
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const cols = Math.ceil(dim.width / width);
  const rows = Math.ceil(dim.height / height);
  const dots = Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: col * width + cx + x,
      y: row * height + cy + y,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    };
  });

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-edge",
        className
      )}
      {...props}
    >
      <defs>
        <radialGradient id={`${id}-g`}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots.map((d) => (
        <motion.circle
          key={`${d.x}-${d.y}`}
          cx={d.x}
          cy={d.y}
          r={cr}
          fill={glow ? `url(#${id}-g)` : "currentColor"}
          initial={glow ? { opacity: 0.4, scale: 1 } : false}
          animate={
            glow
              ? { opacity: [0.3, 0.9, 0.3], scale: [1, 1.4, 1] }
              : { opacity: 0.6 }
          }
          transition={
            glow
              ? {
                  duration: d.duration,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: d.delay,
                  ease: "easeInOut",
                }
              : { duration: 0 }
          }
        />
      ))}
    </svg>
  );
}
