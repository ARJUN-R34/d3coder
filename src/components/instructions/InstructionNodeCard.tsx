"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, CopyIcon, CheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParsedRawTabs } from "@/components/instructions/ParsedRawTabs";
import { truncateAddress } from "@/lib/format";
import { getParsedAmountLabel } from "@/lib/solana/instruction-amounts";
import type { InstructionNode } from "@/lib/solana/types";
import { cn } from "@/lib/utils";

// Depth-based glass opacity — deeper CPI panes are slightly more opaque
// to create a sense of layered depth.
const DEPTH_BG_CLASSES: Record<number, string> = {
  0: "bg-white/[0.06]",
  1: "bg-white/[0.08]",
  2: "bg-white/[0.10]",
};

function depthBg(depth: number): string {
  return DEPTH_BG_CLASSES[Math.min(depth, 2)];
}

function ProgramCopyButton({ text }: { text: string }) {
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
      aria-label={copied ? "Copied!" : "Copy program ID"}
      className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      {copied ? (
        <CheckIcon className="h-3 w-3 text-green-400" />
      ) : (
        <CopyIcon className="h-3 w-3" />
      )}
    </button>
  );
}

interface InstructionNodeCardProps {
  node: InstructionNode;
  /** Whether this card is the last sibling (affects connector line rendering). */
  isLast?: boolean;
}

export function InstructionNodeCard({
  node,
  isLast = false,
}: InstructionNodeCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isKnown = node.program.known;
  const amountLabel = getParsedAmountLabel(node.parsed?.info);

  return (
    <div className="relative">
      <Card
        className={cn(
          "border-white/[0.10] backdrop-blur-xl ring-0 shadow-none",
          depthBg(node.depth)
        )}
      >
        <CardHeader className="pb-2">
          {/* Top row: collapse toggle + index badge + program info */}
          <div className="flex items-start gap-2 min-w-0">
            {/* Collapse / expand toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? "Collapse instruction" : "Expand instruction"}
              aria-expanded={isExpanded}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {/* Index badge */}
            <Badge
              variant="outline"
              className="font-mono text-[10px] h-5 px-1.5 shrink-0 mt-0.5 text-muted-foreground"
            >
              {node.id}
            </Badge>

            {/* Program name + ID */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm text-foreground">
                  {isKnown
                    ? node.program.label
                    : truncateAddress(node.program.programId, 8, 8)}
                </span>
                {!isKnown && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1 text-muted-foreground"
                  >
                    Unknown Program
                  </Badge>
                )}
                {node.parsed?.type && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-primary/30">
                    {node.parsed.type}
                  </Badge>
                )}
                {amountLabel && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 font-mono text-sky-300 border-sky-500/30"
                  >
                    {amountLabel}
                  </Badge>
                )}
                {hasChildren && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1 ml-auto"
                  >
                    {node.children.length} CPI
                    {node.children.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {/* Program ID (always shown, mono, copyable) */}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-mono text-[11px] text-muted-foreground/70 truncate">
                  {node.program.programId}
                </span>
                <ProgramCopyButton text={node.program.programId} />
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Parsed/Raw tabs — shown when expanded */}
        {isExpanded && (
          <CardContent className="pt-0">
            <ParsedRawTabs node={node} />
          </CardContent>
        )}
      </Card>

      {/* CPI children — indented with connector line */}
      {hasChildren && isExpanded && (
        <div
          className={cn(
            "ml-6 mt-2 space-y-2",
            "border-l-2 border-white/[0.08] pl-4",
            isLast && "border-l-transparent"
          )}
        >
          {node.children.map((child, i) => (
            <InstructionNodeCard
              key={child.id}
              node={child}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
