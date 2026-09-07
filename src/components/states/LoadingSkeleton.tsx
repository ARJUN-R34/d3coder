import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassPanel } from "@/components/glass/GlassPanel";

/**
 * Glass skeleton cards shown while the transaction is being decoded.
 * Uses shimmer Skeleton components inside GlassPanel containers.
 */
export function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading transaction" aria-busy="true">
      {/* Overview skeleton */}
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-5 w-56 bg-white/10" />
          <Skeleton className="h-5 w-20 rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2"
            >
              <Skeleton className="h-3 w-16 bg-white/10" />
              <Skeleton className="h-5 w-24 bg-white/10" />
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Instructions skeleton */}
      <div>
        <Skeleton className="h-4 w-24 mb-3 bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-5 py-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded bg-white/10" />
                <Skeleton className="h-5 w-12 rounded-full bg-white/10" />
                <Skeleton className="h-5 w-32 bg-white/10" />
                <Skeleton className="h-5 w-20 rounded-full bg-white/10 ml-auto" />
              </div>
              <Skeleton className="h-3 w-64 bg-white/10" />
              <div className="space-y-2 pt-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex gap-3">
                    <Skeleton className="h-3 w-28 bg-white/10" />
                    <Skeleton className="h-3 w-40 bg-white/10" />
                  </div>
                ))}
              </div>
              {/* Nested CPI skeleton (only for first card) */}
              {i === 0 && (
                <div className="ml-6 border-l-2 border-white/[0.08] pl-4 mt-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded bg-white/10" />
                      <Skeleton className="h-5 w-10 rounded-full bg-white/10" />
                      <Skeleton className="h-5 w-28 bg-white/10" />
                    </div>
                    <Skeleton className="h-3 w-52 bg-white/10" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Deltas skeleton */}
      <GlassPanel className="p-4 space-y-2">
        <Skeleton className="h-4 w-24 mb-1 bg-white/10" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/[0.03]"
          >
            <Skeleton className="h-4 w-4 rounded bg-white/10" />
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-4 w-40 bg-white/10 ml-auto" />
            <Skeleton className="h-4 w-16 bg-white/10" />
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}
