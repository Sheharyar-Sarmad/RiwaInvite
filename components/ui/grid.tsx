import React from "react";
import { cn } from "@/lib/utils"; // Assuming you have a utility for class merging

export function Grid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Base grid styling
        "pointer-events-none absolute inset-0 h-full w-full",
        // SVG Grid pattern
        "[background-size:40px_40px]",
        "[background-image:linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)]",
        // Fade out effect towards the edges
        "[mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]",
        className
      )}
      {...props}
    />
  );
}