import React from "react";
import { InstructionNodeCard } from "@/components/instructions/InstructionNodeCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import type { InstructionNode } from "@/lib/solana/types";

interface InstructionTreeProps {
  instructions: InstructionNode[];
}

export function InstructionTree({ instructions }: InstructionTreeProps) {
  if (instructions.length === 0) {
    return (
      <GlassPanel className="p-5 text-center">
        <p className="text-sm text-muted-foreground">No instructions found.</p>
      </GlassPanel>
    );
  }

  return (
    <section aria-label="Instruction tree">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Instructions
      </h2>
      <div className="space-y-3">
        {instructions.map((node, i) => (
          <InstructionNodeCard
            key={node.id}
            node={node}
            isLast={i === instructions.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
