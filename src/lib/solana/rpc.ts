import {
  Connection,
  type ParsedTransactionWithMeta,
  type TransactionSignature,
} from "@solana/web3.js";

/** RPC request timeout in milliseconds. */
const RPC_TIMEOUT_MS = 30_000;

/**
 * Fetches a parsed transaction from the RPC endpoint.
 *
 * Returns null if the transaction is not found.
 * Throws on network errors or timeout.
 *
 * Intentionally thin and mockable — the caller (route handler or tests)
 * can swap the implementation by injecting a different `fetchFn`.
 */
export async function getTransaction(
  endpoint: string,
  signature: TransactionSignature,
  fetchFn: typeof _defaultFetch = _defaultFetch,
): Promise<ParsedTransactionWithMeta | null> {
  return fetchFn(endpoint, signature);
}

async function _defaultFetch(
  endpoint: string,
  signature: TransactionSignature,
): Promise<ParsedTransactionWithMeta | null> {
  const connection = new Connection(endpoint, {
    commitment: "confirmed",
    httpHeaders: { "Content-Type": "application/json" },
  });

  const timeoutSignal = AbortSignal.timeout
    ? AbortSignal.timeout(RPC_TIMEOUT_MS)
    : undefined;

  const result = await Promise.race([
    connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    }),
    timeoutSignal
      ? new Promise<never>((_, reject) => {
          timeoutSignal.addEventListener("abort", () => {
            reject(new Error("RPC request timed out"));
          });
        })
      : new Promise<never>(() => {
          // No-op: falls through to the getParsedTransaction result
        }),
  ]);

  return result;
}
