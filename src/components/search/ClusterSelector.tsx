"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cluster } from "@/lib/solana/types";

interface ClusterSelectorProps {
  value: Cluster;
  onChange: (cluster: Cluster) => void;
  disabled?: boolean;
}

const CLUSTER_LABELS: Record<Cluster, string> = {
  "mainnet-beta": "Mainnet Beta",
  devnet: "Devnet",
  testnet: "Testnet",
};

export function ClusterSelector({
  value,
  onChange,
  disabled,
}: ClusterSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as Cluster)}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-[160px] bg-white/5 border-white/10 backdrop-blur-sm text-sm focus:ring-ring"
        aria-label="Select cluster"
      >
        <SelectValue placeholder="Select cluster" />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900/95 border-white/10 backdrop-blur-2xl">
        {(Object.keys(CLUSTER_LABELS) as Cluster[]).map((cluster) => (
          <SelectItem
            key={cluster}
            value={cluster}
            className="text-sm focus:bg-white/10"
          >
            {CLUSTER_LABELS[cluster]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
