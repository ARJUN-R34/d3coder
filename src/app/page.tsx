"use client";

import React, { useCallback, useState } from "react";
import { BlobField } from "@/components/glass/BlobField";
import { SignatureSearch } from "@/components/search/SignatureSearch";
import { TransactionOverview } from "@/components/overview/TransactionOverview";
import { InstructionTree } from "@/components/instructions/InstructionTree";
import { TokenBalanceDeltas } from "@/components/deltas/TokenBalanceDeltas";
import { SolDeltas } from "@/components/deltas/SolDeltas";
import { LogPanel } from "@/components/logs/LogPanel";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { NotFoundState } from "@/components/states/NotFoundState";
import { ErrorState } from "@/components/states/ErrorState";
import type {
  Cluster,
  DecodeErrorCode,
  DecodeResult,
  DecodeError,
} from "@/lib/solana/types";

// ---------------------------------------------------------------------------
// Page state
// ---------------------------------------------------------------------------

type PageStatus = "idle" | "loading" | "success" | "not_found" | "error";

interface PageState {
  status: PageStatus;
  result: DecodeResult | null;
  errorCode: DecodeErrorCode | null;
  errorMessage: string | null;
  /** Last decoded signature — shown in not-found state. */
  lastSignature: string | null;
}

const INITIAL_STATE: PageState = {
  status: "idle",
  result: null,
  errorCode: null,
  errorMessage: null,
  lastSignature: null,
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function Home() {
  const [pageState, setPageState] = useState<PageState>(INITIAL_STATE);
  const [cluster, setCluster] = useState<Cluster>("mainnet-beta");
  const [rpc, setRpc] = useState<string>("");

  const handleDecode = useCallback(
    async (signature: string) => {
      setPageState({
        status: "loading",
        result: null,
        errorCode: null,
        errorMessage: null,
        lastSignature: signature,
      });

      try {
        const params = new URLSearchParams({ signature, cluster });
        if (rpc.trim()) {
          params.set("rpc", rpc.trim());
        }

        const response = await fetch(`/api/transaction?${params.toString()}`);
        const data: DecodeResult | DecodeError = await response.json();

        if (response.ok) {
          setPageState({
            status: "success",
            result: data as DecodeResult,
            errorCode: null,
            errorMessage: null,
            lastSignature: signature,
          });
          return;
        }

        const error = data as DecodeError;

        if (response.status === 404 || error.code === "not_found") {
          setPageState({
            status: "not_found",
            result: null,
            errorCode: "not_found",
            errorMessage: error.message,
            lastSignature: signature,
          });
          return;
        }

        setPageState({
          status: "error",
          result: null,
          errorCode: error.code,
          errorMessage: error.message,
          lastSignature: signature,
        });
      } catch (err) {
        setPageState({
          status: "error",
          result: null,
          errorCode: "internal",
          errorMessage:
            err instanceof Error ? err.message : "An unexpected error occurred.",
          lastSignature: signature,
        });
      }
    },
    [cluster, rpc]
  );

  // ---------------------------------------------------------------------------
  // Status-driven result area
  // ---------------------------------------------------------------------------

  function renderResults() {
    switch (pageState.status) {
      case "idle":
        return <EmptyState />;

      case "loading":
        return <LoadingSkeleton />;

      case "success": {
        const result = pageState.result!;
        return (
          <div className="space-y-5">
            <TransactionOverview overview={result.overview} />
            <InstructionTree instructions={result.instructions} />
            {result.tokenDeltas.length > 0 && (
              <TokenBalanceDeltas deltas={result.tokenDeltas} />
            )}
            {result.solDeltas.length > 0 && (
              <SolDeltas deltas={result.solDeltas} />
            )}
            <LogPanel logs={result.logs} />
          </div>
        );
      }

      case "not_found":
        return (
          <NotFoundState signature={pageState.lastSignature ?? undefined} />
        );

      case "error":
        return (
          <ErrorState
            code={pageState.errorCode!}
            message={pageState.errorMessage ?? undefined}
          />
        );

      default: {
        // Exhaustive check
        const _exhaustive: never = pageState.status;
        console.error("Unhandled page status:", _exhaustive);
        return null;
      }
    }
  }

  return (
    <>
      {/* Animated liquid blob field — behind all content */}
      <BlobField />

      {/* Page shell */}
      <div className="flex flex-col flex-1 min-h-screen">
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-6">
          {/* Hero search */}
          <SignatureSearch
            cluster={cluster}
            rpc={rpc}
            onClusterChange={setCluster}
            onRpcChange={setRpc}
            onDecode={handleDecode}
            isLoading={pageState.status === "loading"}
          />

          {/* Results area */}
          <div>{renderResults()}</div>
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground/40">
          Solana Transaction Decoder
        </footer>
      </div>
    </>
  );
}
