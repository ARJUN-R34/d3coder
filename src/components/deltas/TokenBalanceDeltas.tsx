import React from "react";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { truncateAddress } from "@/lib/format";
import type { TokenBalanceDelta } from "@/lib/solana/types";
import { cn } from "@/lib/utils";

interface TokenBalanceDeltasProps {
  deltas: TokenBalanceDelta[];
}

function deltaSign(deltaUi: string): "positive" | "negative" | "zero" {
  const num = parseFloat(deltaUi);
  if (num > 0) return "positive";
  if (num < 0) return "negative";
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

interface DeltaRowProps {
  delta: TokenBalanceDelta;
}

function DeltaRow({ delta }: DeltaRowProps) {
  const sign = deltaSign(delta.deltaUi);
  const config = signConfig[sign];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2",
        config.bgClass
      )}
    >
      {/* Direction icon */}
      <Icon
        className={cn("h-4 w-4 shrink-0", config.textClass)}
        aria-label={config.label}
      />

      {/* Mint + owner */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-mono text-xs text-foreground/80 truncate">
          {truncateAddress(delta.mint, 8, 8)}
        </span>
        {delta.owner && (
          <span className="font-mono text-[11px] text-muted-foreground/60 truncate">
            {truncateAddress(delta.owner, 6, 6)}
          </span>
        )}
      </div>

      {/* Pre → Post */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground/70 shrink-0">
        <span className="font-mono">{delta.preAmount}</span>
        <span>→</span>
        <span className="font-mono">{delta.postAmount}</span>
      </div>

      {/* Delta */}
      <div
        className={cn(
          "font-mono text-sm font-semibold shrink-0 min-w-[80px] text-right",
          config.textClass
        )}
        aria-label={`${config.label}: ${config.prefix}${delta.deltaUi}`}
      >
        {config.prefix}
        {delta.deltaUi}
      </div>
    </div>
  );
}

export function TokenBalanceDeltas({ deltas }: TokenBalanceDeltasProps) {
  if (deltas.length === 0) return null;

  return (
    <section aria-label="Token balance changes">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Token Balances
      </h2>
      <GlassPanel className="p-4 space-y-2">
        {deltas.map((delta, i) => (
          <DeltaRow key={`${delta.mint}-${delta.owner ?? i}`} delta={delta} />
        ))}
      </GlassPanel>
    </section>
  );
}
