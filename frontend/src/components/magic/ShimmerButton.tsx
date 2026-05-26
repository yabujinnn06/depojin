import { forwardRef, ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: ReactNode;
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "14px",
      background = "rgb(15,42,68)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 inline-flex cursor-pointer items-center justify-center overflow-hidden border border-white/10 px-6 py-3 whitespace-nowrap text-white",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-visible blur-[2px] -z-30"
          style={{ containerType: "size" } as CSSProperties}
        >
          <div className="animate-shimmer-slide absolute inset-0 aspect-[1] h-[100cqh] rounded-none">
            <div
              className="animate-spin-around absolute -inset-full w-auto rotate-0"
              style={{
                background:
                  "conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, var(--shimmer-color) var(--spread), transparent var(--spread))",
              }}
            />
          </div>
        </div>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full rounded-2xl px-4 py-1.5 text-sm font-medium",
            "shadow-[inset_0_-8px_10px_#ffffff1f]",
            "transform-gpu transition-all duration-300 ease-in-out",
            "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
            "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
          )}
          style={{ borderRadius: "var(--radius)" }}
        />
        <div
          aria-hidden="true"
          className="absolute -z-20"
          style={{
            inset: "var(--cut)",
            borderRadius: "var(--radius)",
            background: "var(--bg)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-40"
          style={{
            borderRadius: "var(--radius)",
            background: "var(--bg)",
          }}
        />
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";
