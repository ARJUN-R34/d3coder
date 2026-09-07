import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import type { DecodeResult } from "./types";
import { buildTransactionOverview } from "./overview";
import { buildInstructionTree } from "./instruction-tree";
import { enrichInstructionAmounts } from "./instruction-amounts";
import { computeTokenDeltas, computeSolDeltas } from "./deltas";

/**
 * Orchestrates the full decode pipeline:
 * raw parsed transaction → typed DecodeResult.
 *
 * Pure and deterministic — all inputs must be provided; no network calls.
 */
export function decodeTransaction(
  signature: string,
  rawTx: ParsedTransactionWithMeta,
): DecodeResult {
  const overview = buildTransactionOverview(signature, rawTx);
  const instructions = enrichInstructionAmounts(
    buildInstructionTree(rawTx),
    rawTx,
  );
  const tokenDeltas = computeTokenDeltas(rawTx);
  const solDeltas = computeSolDeltas(rawTx);
  const logs = rawTx.meta?.logMessages ?? [];

  return {
    overview,
    instructions,
    tokenDeltas,
    solDeltas,
    logs,
  };
}
