import type { Cluster } from "./types";

/** Public cluster RPC defaults. */
const CLUSTER_DEFAULTS: Record<Cluster, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
};

/**
 * Resolves the RPC endpoint to use for a given request.
 *
 * Precedence (highest → lowest):
 * 1. A validated custom `rpc` URL passed in the request.
 * 2. The `SOLANA_RPC_URL` environment variable (server-side only).
 * 3. The public cluster default for `cluster`.
 */
export function resolveEndpoint(cluster: Cluster, rpc?: string): string {
  if (rpc) {
    return rpc;
  }

  const envRpc = process.env.SOLANA_RPC_URL;
  if (envRpc) {
    return envRpc;
  }

  return CLUSTER_DEFAULTS[cluster];
}

/** Returns the public default endpoint for a cluster (used in fallback messaging). */
export function getClusterDefault(cluster: Cluster): string {
  return CLUSTER_DEFAULTS[cluster];
}
