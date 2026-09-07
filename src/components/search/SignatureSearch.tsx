"use client";

import React, { useRef, useState } from "react";
import { ClipboardIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { ClusterSelector } from "@/components/search/ClusterSelector";
import { RpcInput } from "@/components/search/RpcInput";
import { cn } from "@/lib/utils";
import type { Cluster } from "@/lib/solana/types";

// Base58 character set — used for lightweight client-side validation.
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isLikelyValidSignature(sig: string): boolean {
  const s = sig.trim();
  return s.length >= 80 && s.length <= 100 && BASE58_REGEX.test(s);
}

interface SignatureSearchProps {
  cluster: Cluster;
  rpc: string;
  onClusterChange: (cluster: Cluster) => void;
  onRpcChange: (rpc: string) => void;
  onDecode: (signature: string) => void;
  isLoading: boolean;
}

export function SignatureSearch({
  cluster,
  rpc,
  onClusterChange,
  onRpcChange,
  onDecode,
  isLoading,
}: SignatureSearchProps) {
  const [signature, setSignature] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSignatureChange(value: string) {
    setSignature(value);
    if (validationError && isLikelyValidSignature(value)) {
      setValidationError(null);
    }
  }

  function handleDecode() {
    const trimmed = signature.trim();
    if (!trimmed) {
      setValidationError("Please enter a transaction signature.");
      inputRef.current?.focus();
      return;
    }
    if (!isLikelyValidSignature(trimmed)) {
      setValidationError(
        "Invalid signature. Expected base58, ~87–88 characters."
      );
      inputRef.current?.focus();
      return;
    }
    setValidationError(null);
    onDecode(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleDecode();
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      handleSignatureChange(text.trim());
      inputRef.current?.focus();
    } catch {
      // Clipboard access denied; user can paste manually
    }
  }

  const hasValidationError = validationError !== null;

  return (
    <GlassPanel className="p-6 sm:p-8 w-full">
      {/* Hero heading */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Solana Transaction Decoder
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a transaction signature to explore instructions, balance deltas,
          and logs.
        </p>
      </div>

      {/* Primary input row */}
      <div className="flex flex-col gap-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              id="signature-input"
              value={signature}
              onChange={(e) => handleSignatureChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter transaction signature…"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              disabled={isLoading}
              aria-label="Transaction signature"
              aria-invalid={hasValidationError}
              aria-describedby={
                hasValidationError ? "sig-validation-error" : undefined
              }
              className={cn(
                "font-mono text-sm pr-12 h-12",
                "bg-white/5 border-white/10 backdrop-blur-sm",
                "placeholder:text-muted-foreground/40",
                "focus-visible:ring-ring",
                hasValidationError &&
                  "border-destructive focus-visible:ring-destructive/50"
              )}
            />
            {/* Paste from clipboard */}
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading}
              aria-label="Paste from clipboard"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Decode button */}
          <Button
            onClick={handleDecode}
            disabled={isLoading}
            className="h-12 px-6 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Decode transaction"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            {isLoading ? "Decoding…" : "Decode"}
          </Button>
        </div>

        {/* Inline validation error */}
        {hasValidationError && (
          <p
            id="sig-validation-error"
            role="alert"
            className="text-xs text-destructive flex items-center gap-1"
          >
            {validationError}
          </p>
        )}

        {/* Cluster selector row + advanced toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cluster:</span>
            <ClusterSelector
              value={cluster}
              onChange={onClusterChange}
              disabled={isLoading}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {showAdvanced ? "Hide advanced ↑" : "Advanced options ↓"}
          </button>
        </div>

        {/* Advanced: Custom RPC */}
        {showAdvanced && (
          <div className="pt-1">
            <RpcInput
              value={rpc}
              onChange={onRpcChange}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
