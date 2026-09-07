import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import type { SolBalanceDelta, TokenBalanceDelta } from "./types";

/**
 * Computes per-owner/per-mint token balance deltas from meta pre/post balances.
 * Only includes entries where the delta is non-zero.
 */
export function computeTokenDeltas(
  rawTx: ParsedTransactionWithMeta,
): TokenBalanceDelta[] {
  const meta = rawTx.meta;
  if (!meta?.preTokenBalances || !meta?.postTokenBalances) {
    return [];
  }

  // Index pre-balances by accountIndex
  const preByIndex = new Map(
    meta.preTokenBalances.map((b) => [b.accountIndex, b]),
  );
  const postByIndex = new Map(
    meta.postTokenBalances.map((b) => [b.accountIndex, b]),
  );

  const allIndexes = new Set([
    ...preByIndex.keys(),
    ...postByIndex.keys(),
  ]);

  const deltas: TokenBalanceDelta[] = [];

  for (const index of allIndexes) {
    const pre = preByIndex.get(index);
    const post = postByIndex.get(index);

    // Use post for mint/owner/decimals (post may have newly-created accounts)
    const reference = post ?? pre;
    if (!reference) continue;

    const mint = reference.mint;
    const owner = reference.owner ?? null;
    const decimals = reference.uiTokenAmount.decimals;

    const preUiAmount = pre?.uiTokenAmount.uiAmountString ?? "0";
    const postUiAmount = post?.uiTokenAmount.uiAmountString ?? "0";

    const preValue = parseFloat(preUiAmount);
    const postValue = parseFloat(postUiAmount);
    const delta = postValue - preValue;

    if (delta === 0) continue;

    const sign = delta >= 0 ? "+" : "";
    const deltaUi = `${sign}${delta.toFixed(decimals > 0 ? Math.min(decimals, 9) : 0)}`;

    deltas.push({
      owner,
      mint,
      preAmount: preUiAmount,
      postAmount: postUiAmount,
      deltaUi,
      decimals,
    });
  }

  return deltas;
}

/**
 * Computes per-account native SOL balance deltas.
 * Only includes accounts where the delta is non-zero.
 */
export function computeSolDeltas(
  rawTx: ParsedTransactionWithMeta,
): SolBalanceDelta[] {
  const meta = rawTx.meta;
  const accountKeys = rawTx.transaction.message.accountKeys;

  if (!meta?.preBalances || !meta?.postBalances) {
    return [];
  }

  const deltas: SolBalanceDelta[] = [];

  for (let i = 0; i < accountKeys.length; i++) {
    const preLamports = meta.preBalances[i] ?? 0;
    const postLamports = meta.postBalances[i] ?? 0;
    const deltaLamports = postLamports - preLamports;

    if (deltaLamports === 0) continue;

    deltas.push({
      account: accountKeys[i].pubkey.toBase58(),
      preLamports,
      postLamports,
      deltaLamports,
    });
  }

  return deltas;
}
