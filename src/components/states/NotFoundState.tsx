import React from "react";
import { FileSearchIcon } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";

interface NotFoundStateProps {
  signature?: string;
}

/**
 * Shown when the API returns a 404 (transaction not found / not confirmed).
 */
export function NotFoundState({ signature }: NotFoundStateProps) {
  return (
    <GlassPanel
      depth="shallow"
      className="p-10 text-center"
      role="alert"
      aria-label="Transaction not found"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <FileSearchIcon className="h-6 w-6 text-amber-400/80" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground/80">
            Transaction not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            This transaction may not have been confirmed yet, or the signature
            may be incorrect. Try again or switch to a different cluster.
          </p>
        </div>
        {signature && (
          <p className="font-mono text-xs text-muted-foreground/50 break-all max-w-md">
            {signature}
          </p>
        )}
      </div>
    </GlassPanel>
  );
}
