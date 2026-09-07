import React from "react";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { formatLamportsToSol, truncateAddress } from "@/lib/format";
import type { SolBalanceDelta } from "@/lib/solana/types";
import { cn } from "@/lib/utils";

interface SolDeltasProps {
  deltas: SolBalanceDelta[];
}

function deltaSign(deltaLamports: number): "positive" | "negative" | "zero" {
  if (deltaLamports > 0) return "positive";
  if (deltaLamports < 0) return "negative";
  return "zero";
}

const signConfig = {
  positive: {
    icon: TrendingUpIcon,
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    label: "increase",
    prefix: "+",
  },
  negative: {
    icon: TrendingDownIcon,
    textClass: "text-red-400",
    bgClass: "bg-red-500/10",
    label: "decrease",
    prefix: "",
  },
  zero: {
    icon: MinusIcon,
    textClass: "text-muted-foreground",
    bgClass: "bg-white/[0.03]",
    label: "no change",
    prefix: "",
  },
};

interface SolDeltaRowProps {
  delta: SolBalanceDelta;
}

function SolDeltaRow({ delta }: SolDeltaRowProps) {
  const sign = deltaSign(delta.deltaLamports);
  const config = signConfig[sign];
  const Icon = config.icon;

  const formattedDelta = formatLamportsToSol(Math.abs(delta.deltaLamports));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2",
        config.bgClass
      )}
    >
      {/* Direction icon — never color-only: also has text label via aria */}
      <Icon
        className={cn("h-4 w-4 shrink-0", config.textClass)}
        aria-label={config.label}
      />

      {/* Account */}
      <span className="font-mono text-xs text-foreground/80 min-w-0 flex-1 truncate">
        {truncateAddress(delta.account, 8, 8)}
      </span>

      {/* Pre → Post (lamports) */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground/70 shrink-0">
        <span className="font-mono">
          {formatLamportsToSol(delta.preLamports)}
        </span>
        <span>→</span>
        <span className="font-mono">
          {formatLamportsToSol(delta.postLamports)}
        </span>
      </div>

      {/* Delta */}
      <div
        className={cn(
          "font-mono text-sm font-semibold shrink-0 min-w-[100px] text-right",
          config.textClass
        )}
        aria-label={`${config.label}: ${config.prefix}${formattedDelta}`}
      >
        {config.prefix}
        {formattedDelta}
      </div>
    </div>
  );
}

export function SolDeltas({ deltas }: SolDeltasProps) {
  // Only show accounts with non-zero delta to keep the panel compact
  const nonZeroDeltas = deltas.filter((d) => d.deltaLamports !== 0);

  if (nonZeroDeltas.length === 0) return null;

  return (
    <section aria-label="SOL balance changes">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        SOL Balances
      </h2>
      <GlassPanel className="p-4 space-y-2">
        {nonZeroDeltas.map((delta) => (
          <SolDeltaRow key={delta.account} delta={delta} />
        ))}
      </GlassPanel>
    </section>
  );
}
