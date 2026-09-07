import React from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.ComponentProps<"div"> {
  /** Controls opacity depth of the glass surface. Deeper = less transparent. */
  depth?: "shallow" | "default" | "deep";
}

const depthClasses: Record<NonNullable<GlassPanelProps["depth"]>, string> = {
  shallow: "bg-white/[0.03]",
  default: "bg-white/[0.05]",
  deep: "bg-white/[0.08]",
};

/**
 * Liquid-glass surface primitive.
 * Provides backdrop-blur, translucent fill, hairline border,
 * and an inner specular highlight on the top edge.
 */
export function GlassPanel({
  className,
  depth = "default",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl",
        "backdrop-blur-2xl",
        depthClasses[depth],
        "border border-white/[0.10]",
        // Inner specular highlight (top edge light catch)
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.35)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
