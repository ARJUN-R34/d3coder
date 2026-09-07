import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import type { TransactionOverview } from "./types";

/**
 * Derives a TransactionOverview from a raw parsed transaction.
 * All fields map directly from the RPC response — no network calls.
 */
export function buildTransactionOverview(
  signature: string,
  rawTx: ParsedTransactionWithMeta,
): TransactionOverview {
  const message = rawTx.transaction.message;
  const meta = rawTx.meta;

  const status = meta?.err == null ? "success" : "failed";
  const error = meta?.err != null ? JSON.stringify(meta.err) : null;

  // Account keys with signer/writable flags
  const accountKeys = message.accountKeys;

  // Fee payer is the first writable-signer account key
  const feePayer =
    accountKeys.find((k) => k.signer && k.writable)?.pubkey.toBase58() ??
    accountKeys[0]?.pubkey.toBase58() ??
    "";

  const signers = accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey.toBase58());

  const topLevelCount = message.instructions.length;
  const totalInstructionCount =
    topLevelCount +
    (meta?.innerInstructions?.reduce(
      (sum, group) => sum + group.instructions.length,
      0,
    ) ?? 0);

  // Transaction version: rawTx.version is 0 for v0, undefined/"legacy" for legacy
  const version: "legacy" | 0 =
    rawTx.version === 0 ? 0 : "legacy";

  return {
    signature,
    status,
    error,
    slot: rawTx.slot,
    blockTime: rawTx.blockTime ?? null,
    feeLamports: meta?.fee ?? 0,
    computeUnitsConsumed: meta?.computeUnitsConsumed ?? null,
    version,
    feePayer,
    signers,
    topLevelCount,
    totalInstructionCount,
  };
}
