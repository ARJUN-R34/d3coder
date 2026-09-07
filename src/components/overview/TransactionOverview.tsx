"use client";

import React, { useState } from "react";
import {
  CheckCircle2Icon,
  XCircleIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GlassPanel } from "@/components/glass/GlassPanel";
import {
  formatLamportsToSol,
  formatBlockTime,
  truncateAddress,
} from "@/lib/format";
import type { TransactionOverview as TOverview } from "@/lib/solana/types";

interface TransactionOverviewProps {
  overview: TOverview;
}

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function StatTile({ label, value, mono }: StatTileProps) {
  return (
    <Card
      size="sm"
      className="bg-white/5 border-white/10 backdrop-blur-sm shadow-none ring-0"
    >
      <CardContent className="pt-3 pb-3">
        <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </dt>
        <dd
          className={
            mono
              ? "mt-1 text-sm font-medium font-mono break-all"
              : "mt-1 text-sm font-medium"
          }
        >
          {value}
        </dd>
      </CardContent>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded shrink-0"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-green-400" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </button>
  );
}

export function TransactionOverview({ overview }: TransactionOverviewProps) {
  const isSuccess = overview.status === "success";
  const blockTimeFormatted = formatBlockTime(overview.blockTime);

  return (
    <GlassPanel className="p-5 sm:p-6">
      {/* Header: signature + status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm text-muted-foreground truncate">
            {truncateAddress(overview.signature, 16, 16)}
          </span>
          <CopyButton text={overview.signature} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSuccess ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              Success
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
              <XCircleIcon className="h-3.5 w-3.5" />
              Failed
            </Badge>
          )}
        </div>
      </div>

      {/* Error message when failed */}
      {!isSuccess && overview.error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400 font-mono break-all">
          {overview.error}
        </div>
      )}

      {/* Stat tiles grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatTile label="Slot" value={overview.slot.toLocaleString()} />
        <StatTile
          label="Block Time"
          value={blockTimeFormatted ?? "—"}
        />
        <StatTile
          label="Fee"
          value={
            <span className="flex flex-col gap-0.5">
              <span>{overview.feeLamports.toLocaleString()} lamports</span>
              <span className="text-xs text-muted-foreground">
                {formatLamportsToSol(overview.feeLamports)}
              </span>
            </span>
          }
        />
        <StatTile
          label="Compute Units"
          value={
            overview.computeUnitsConsumed !== null
              ? overview.computeUnitsConsumed.toLocaleString()
              : "—"
          }
        />
        <StatTile
          label="Version"
          value={
            <Badge variant="outline" className="font-mono text-xs w-fit">
              {overview.version === "legacy" ? "Legacy" : `v${overview.version}`}
            </Badge>
          }
        />
        <StatTile
          label="Instructions"
          value={
            <span className="flex flex-col gap-0.5">
              <span>{overview.topLevelCount} top-level</span>
              <span className="text-xs text-muted-foreground">
                {overview.totalInstructionCount} total (incl. CPI)
              </span>
            </span>
          }
        />
        <StatTile
          label="Signers"
          value={
            <span className="flex flex-col gap-0.5">
              {overview.signers.map((signer, i) => (
                <span key={signer} className="flex items-center gap-1">
                  <span className="font-mono text-xs">
                    {truncateAddress(signer, 6, 6)}
                  </span>
                  {i === 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      fee payer
                    </Badge>
                  )}
                </span>
              ))}
            </span>
          }
        />
      </dl>
    </GlassPanel>
  );
}
