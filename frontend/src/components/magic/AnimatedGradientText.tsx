import { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "../../lib/cn";

export interface AnimatedGradientTextProps extends ComponentPropsWithoutRef<"span"> {
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "#BF6F34",
  colorTo = "#7FB3E0",
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      style={
        {
          "--bg-size": `${speed * 300}%`,
          backgroundImage: `linear-gradient(to right, ${colorFrom}, ${colorTo}, ${colorFrom})`,
          backgroundSize: `${speed * 300}% 100%`,
        } as CSSProperties
      }
      className={cn(
        "animate-gradient inline bg-clip-text text-transparent",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
