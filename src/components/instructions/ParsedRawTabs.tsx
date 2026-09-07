"use client";

import React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { AccountList } from "@/components/instructions/AccountList";
import { truncateAddress } from "@/lib/format";
import type { InstructionNode } from "@/lib/solana/types";

// ---------------------------------------------------------------------------
// Parsed view helpers
// ---------------------------------------------------------------------------

function renderInfoValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/60 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className="text-amber-400 font-mono">{String(value)}</span>
    );
  }
  if (typeof value === "number") {
    return <span className="text-sky-400 font-mono">{value}</span>;
  }
  if (typeof value === "string") {
    // Looks like a base58 pubkey (32-50 chars, base58 charset)
    if (
      value.length >= 32 &&
      value.length <= 50 &&
      /^[1-9A-HJ-NP-Za-km-z]+$/.test(value)
    ) {
      return (
        <span className="font-mono text-emerald-400/90">
          {truncateAddress(value, 8, 8)}
          <span className="text-muted-foreground/40 ml-1 text-[10px]">
            ({value})
          </span>
        </span>
      );
    }
    // Long integer strings (often lamports)
    if (/^\d+$/.test(value) && value.length > 6) {
      const num = BigInt(value);
      return (
        <span className="font-mono text-sky-400">
          {num.toLocaleString()}
        </span>
      );
    }
    return <span className="text-foreground/80 font-mono">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground/60 italic">[]</span>;
    }
    if (depth > 1) {
      return (
        <span className="text-muted-foreground/60 italic">
          [{value.length} items]
        </span>
      );
    }
    return (
      <div className="mt-1 space-y-0.5 pl-3 border-l border-white/10">
        {value.map((item, i) => (
          <div key={i}>{renderInfoValue(item, depth + 1)}</div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-muted-foreground/60 italic">{"{}"}</span>;
    }
    if (depth > 2) {
      return (
        <span className="font-mono text-xs text-muted-foreground/60">
          {JSON.stringify(value)}
        </span>
      );
    }
    return (
      <div className="mt-1 space-y-1 pl-3 border-l border-white/10">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 items-start">
            <span className="text-muted-foreground text-xs font-mono shrink-0 pt-0.5">
              {k}:
            </span>
            <span className="min-w-0">{renderInfoValue(v, depth + 1)}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <span className="font-mono text-xs text-foreground/80">{String(value)}</span>
  );
}

function ParsedView({ node }: { node: InstructionNode }) {
  if (!node.parsed) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No parsed data available for this instruction. View the{" "}
        <span className="font-medium text-foreground/70">Raw</span> tab.
      </p>
    );
  }

  const infoEntries = Object.entries(node.parsed.info ?? {});

  return (
    <div className="space-y-3">
      {/* Instruction type */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Type
        </span>
        <span className="font-mono text-sm text-foreground/90 bg-white/5 rounded px-2 py-0.5">
          {node.parsed.type}
        </span>
      </div>

      {/* Info fields */}
      {infoEntries.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Fields
          </span>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            {infoEntries.map(([key, val]) => (
              <div key={key} className="flex gap-3 items-start text-sm">
                <span className="text-muted-foreground font-mono text-xs min-w-[120px] shrink-0 pt-0.5">
                  {key}
                </span>
                <span
                  className={
                    key === "amount"
                      ? "min-w-0 break-all font-mono text-sky-300 font-medium"
                      : "min-w-0 break-all"
                  }
                >
                  {key === "amount" && typeof val === "string"
                    ? val
                    : renderInfoValue(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RawView({ node }: { node: InstructionNode }) {
  // Convert data string to hex representation
  const rawData = node.raw.data;

  return (
    <div className="space-y-4">
      {/* Program ID */}
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
          Program ID
        </p>
        <p className="font-mono text-xs text-foreground/80 break-all">
          {node.program.programId}
        </p>
      </div>

      {/* Accounts */}
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
          Accounts ({node.raw.accounts.length})
        </p>
        <AccountList accounts={node.raw.accounts} />
      </div>

      {/* Data */}
      {rawData && (
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Data (base58)
          </p>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <p className="font-mono text-xs text-foreground/70 break-all">
              {rawData}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

interface ParsedRawTabsProps {
  node: InstructionNode;
}

export function ParsedRawTabs({ node }: ParsedRawTabsProps) {
  const defaultTab = node.parsed ? "parsed" : "raw";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-3 h-8 bg-white/5">
        <TabsTrigger value="parsed" className="text-xs">
          Parsed
        </TabsTrigger>
        <TabsTrigger value="raw" className="text-xs">
          Raw
        </TabsTrigger>
      </TabsList>
      <TabsContent value="parsed">
        <ParsedView node={node} />
      </TabsContent>
      <TabsContent value="raw">
        <RawView node={node} />
      </TabsContent>
    </Tabs>
  );
}
