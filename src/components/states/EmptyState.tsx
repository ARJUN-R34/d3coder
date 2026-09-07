import React from "react";
import { SearchIcon } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";

/**
 * Shown on initial page load before any search has been submitted.
 */
export function EmptyState() {
  return (
    <GlassPanel
      depth="shallow"
      className="p-10 text-center"
      role="region"
      aria-label="Getting started"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
          <SearchIcon className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground/80">
            Decode a Solana transaction
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
            Paste a base58 transaction signature above to explore its
            instruction tree, balance changes, and logs.
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground/60">
          <span>→ Top-level and CPI instructions</span>
          <span>→ Known program labels</span>
          <span>→ Token and SOL balance deltas</span>
        </div>
      </div>
    </GlassPanel>
  );
}
