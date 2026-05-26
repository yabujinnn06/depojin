import { memo, CSSProperties, ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  color?: string;
}

export const Ripple = memo(function Ripple({
  mainCircleSize = 240,
  mainCircleOpacity = 0.22,
  numCircles = 7,
  color = "rgba(15,42,68,0.45)",
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none",
        "[mask-image:linear-gradient(to_bottom,white,transparent)]",
        className
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.025;
        const delay = `${i * 0.06}s`;
        return (
          <div
            key={i}
            className="animate-ripple absolute rounded-full border"
            style={{
              "--i": i,
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDelay: delay,
              borderColor: color,
              backgroundColor: "transparent",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
});
