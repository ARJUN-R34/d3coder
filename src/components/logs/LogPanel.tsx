"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GlassPanel } from "@/components/glass/GlassPanel";

interface LogPanelProps {
  logs: string[];
}

export function LogPanel({ logs }: LogPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section aria-label="Transaction logs">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <GlassPanel>
          {/* Header / trigger */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Program Logs
                </h2>
                <span className="text-xs text-muted-foreground/60">
                  ({logs.length})
                </span>
              </div>
              {isOpen ? (
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>

          {/* Collapsible log content */}
          <CollapsibleContent>
            <div className="px-5 pb-5">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No log messages.
                </p>
              ) : (
                <div className="rounded-lg border border-white/5 bg-black/30 overflow-auto max-h-64">
                  <pre className="p-3 text-xs font-mono text-foreground/75 whitespace-pre-wrap break-all leading-relaxed">
                    {logs.join("\n")}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </GlassPanel>
      </Collapsible>
    </section>
  );
}
