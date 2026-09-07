/** Lamports per SOL. */
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Converts a lamport amount to a SOL string, e.g. "0.000005 SOL".
 */
export function formatLamportsToSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  // Show up to 9 decimal places, strip trailing zeros
  const formatted = sol.toFixed(9).replace(/\.?0+$/, "");
  return `${formatted} SOL`;
}

/**
 * Converts a lamport amount to a SOL number.
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Truncates a base58 address to "AAAA…ZZZZ" format.
 * Preserves the full address if it is 12 chars or fewer.
 */
export function truncateAddress(
  address: string,
  prefixLength = 4,
  suffixLength = 4,
): string {
  if (address.length <= prefixLength + suffixLength + 1) {
    return address;
  }
  return `${address.slice(0, prefixLength)}…${address.slice(-suffixLength)}`;
}

/**
 * Formats a Unix timestamp (seconds) to a human-readable UTC string.
 * Returns null if the timestamp is null.
 */
export function formatBlockTime(blockTime: number | null): string | null {
  if (blockTime == null) return null;
  return new Date(blockTime * 1000).toUTCString();
}

/**
 * Formats a Unix timestamp to an ISO 8601 string.
 * Returns null if the timestamp is null.
 */
export function formatBlockTimeIso(blockTime: number | null): string | null {
  if (blockTime == null) return null;
  return new Date(blockTime * 1000).toISOString();
}
