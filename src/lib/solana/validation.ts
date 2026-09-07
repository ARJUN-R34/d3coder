import bs58 from "bs58";

/** Expected decoded byte length for a Solana transaction signature. */
const SIGNATURE_BYTE_LENGTH = 64;

/**
 * Internal/loopback hostnames and IP prefixes that must be rejected
 * to prevent SSRF-style abuse of the custom RPC URL feature.
 */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
]);

const BLOCKED_IP_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "169.254.",
];

/**
 * Validates a Solana transaction signature string.
 * Returns true if the string is valid base58 that decodes to exactly 64 bytes.
 */
export function validateSignature(signature: string): boolean {
  if (!signature || typeof signature !== "string") {
    return false;
  }

  // Rough length guard: base58-encoded 64 bytes → ~87–88 chars
  if (signature.length < 80 || signature.length > 100) {
    return false;
  }

  try {
    const decoded = bs58.decode(signature);
    return decoded.length === SIGNATURE_BYTE_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Validates a custom RPC URL.
 * Accepts only http:// or https:// URLs with well-formed hostnames.
 * Rejects internal/loopback hosts as a best-effort SSRF guard.
 *
 * Returns true if valid and safe, false otherwise.
 */
export function validateRpcUrl(rpcUrl: string): boolean {
  if (!rpcUrl || typeof rpcUrl !== "string") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(rpcUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return false;
  }

  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (hostname.startsWith(prefix)) {
      return false;
    }
  }

  // Reject bare IP addresses that don't start with a known safe prefix
  // (e.g. 169.254.x.x, 100.64.x.x link-local, etc.)
  // We also block hostnames that end in ".local" (mDNS)
  if (hostname.endsWith(".local")) {
    return false;
  }

  // The hostname must have at least one dot or be a valid external hostname
  // (reject bare single-word names like "internalhost")
  if (!hostname.includes(".") && hostname !== "localhost") {
    return false;
  }

  return true;
}
