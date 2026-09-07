"use client";

import React, { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { truncateAddress } from "@/lib/format";
import type { AccountRef } from "@/lib/solana/types";

interface AccountListProps {
  accounts: AccountRef[];
}

function roleBadges(account: AccountRef) {
  const badges: React.ReactNode[] = [];

  if (account.isSigner && account.isWritable) {
    badges.push(
      <Badge
        key="ws"
        className="text-[10px] h-4 px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30"
      >
        Writable Signer
      </Badge>
    );
  } else if (account.isSigner) {
    badges.push(
      <Badge
        key="s"
        className="text-[10px] h-4 px-1.5 bg-blue-500/20 text-blue-400 border-blue-500/30"
      >
        Signer
      </Badge>
    );
  } else if (account.isWritable) {
    badges.push(
      <Badge
        key="w"
        className="text-[10px] h-4 px-1.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      >
        Writable
      </Badge>
    );
  } else {
    badges.push(
      <Badge
        key="r"
        className="text-[10px] h-4 px-1.5 bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
      >
        Readonly
      </Badge>
    );
  }

  if (account.source === "lookup-table") {
    badges.push(
      <Badge
        key="alt"
        className="text-[10px] h-4 px-1.5 bg-purple-500/20 text-purple-400 border-purple-500/30"
      >
        ALT
      </Badge>
    );
  }

  return badges;
}

function AccountRow({ account, index }: { account: AccountRef; index: number }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(account.pubkey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground/60 font-mono w-5 shrink-0">
        {index}
      </span>
      <span className="font-mono text-xs text-foreground/80 min-w-0">
        {truncateAddress(account.pubkey, 8, 8)}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied!" : `Copy ${account.pubkey}`}
        className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded shrink-0"
      >
        {copied ? (
          <CheckIcon className="h-3 w-3 text-green-400" />
        ) : (
          <CopyIcon className="h-3 w-3" />
        )}
      </button>
      <div className="flex items-center gap-1 flex-wrap ml-auto">
        {roleBadges(account)}
      </div>
    </div>
  );
}

export function AccountList({ accounts }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No accounts.</p>
    );
  }

  return (
    <div className="rounded-lg border border-white/5 px-3 py-1 bg-white/[0.02]">
      {accounts.map((account, i) => (
        <AccountRow key={account.pubkey + i} account={account} index={i} />
      ))}
    </div>
  );
}
