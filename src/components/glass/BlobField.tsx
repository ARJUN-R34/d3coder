"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BlobFieldProps {
  className?: string;
}

/**
 * Animated liquid background blobs providing depth behind glass surfaces.
 * Animation is disabled when `prefers-reduced-motion: reduce` is active
 * (handled via .blob-a/.blob-b/.blob-c CSS classes in globals.css).
 */
export function BlobField({ className }: BlobFieldProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 overflow-hidden pointer-events-none -z-10",
        className
      )}
      aria-hidden="true"
    >
      {/* Cyan blob — top-left */}
      <div
        className="blob-a absolute -top-[20%] -left-[10%] w-[65vw] h-[65vw] max-w-[780px] max-h-[780px] rounded-full bg-cyan-500/[0.13] blur-[120px]"
      />
      {/* Violet blob — bottom-right */}
      <div
        className="blob-b absolute -bottom-[15%] -right-[8%] w-[55vw] h-[55vw] max-w-[680px] max-h-[680px] rounded-full bg-violet-500/[0.10] blur-[100px]"
      />
      {/* Indigo blob — center */}
      <div
        className="blob-c absolute top-[40%] left-[35%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full bg-indigo-500/[0.07] blur-[80px]"
      />
    </div>
  );
}
