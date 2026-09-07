/**
 * All domain models for the Solana transaction decoder.
 * Pure TypeScript — no React, no Next.js imports.
 */

// ---------------------------------------------------------------------------
// Cluster
// ---------------------------------------------------------------------------

export type Cluster = "mainnet-beta" | "devnet" | "testnet";

// ---------------------------------------------------------------------------
// Transaction overview
// ---------------------------------------------------------------------------

export interface TransactionOverview {
  signature: string;
  status: "success" | "failed";
  /** Stringified meta.err, or null on success. */
  error: string | null;
  slot: number;
  /** Unix timestamp in seconds, or null if not available. */
  blockTime: number | null;
  feeLamports: number;
  computeUnitsConsumed: number | null;
  version: "legacy" | 0;
  feePayer: string;
  signers: string[];
  topLevelCount: number;
  totalInstructionCount: number;
}

// ---------------------------------------------------------------------------
// Program info
// ---------------------------------------------------------------------------

export type ProgramCategory =
  | "system"
  | "token"
  | "ata"
  | "compute-budget"
  | "memo"
  | "stake"
  | "vote"
  | "alt"
  | "loader"
  | "unknown";

export interface ProgramInfo {
  programId: string;
  label: string;
  category: ProgramCategory;
  known: boolean;
}

// ---------------------------------------------------------------------------
// Account reference
// ---------------------------------------------------------------------------

export interface AccountRef {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
  /** Whether the account was resolved from an Address Lookup Table. */
  source: "static" | "lookup-table";
}

// ---------------------------------------------------------------------------
// Instruction node (recursive)
// ---------------------------------------------------------------------------

export interface InstructionNode {
  /** Stable path key, e.g. "0", "0.1", "0.1.2" */
  id: string;
  /** 0 = top-level CPI depth */
  depth: number;
  /** Order within its parent */
  index: number;
  program: ProgramInfo;
  /** jsonParsed { type, info } when available from RPC, null otherwise. */
  parsed: { type: string; info: Record<string, unknown> } | null;
  raw: {
    accounts: AccountRef[];
    data: string;
  };
  children: InstructionNode[];
}

// ---------------------------------------------------------------------------
// Balance deltas
// ---------------------------------------------------------------------------

export interface TokenBalanceDelta {
  owner: string | null;
  mint: string;
  /** UI-amount string (decimals-aware), pre-transaction. */
  preAmount: string;
  /** UI-amount string (decimals-aware), post-transaction. */
  postAmount: string;
  /** Signed delta in UI units. */
  deltaUi: string;
  decimals: number;
}

export interface SolBalanceDelta {
  account: string;
  preLamports: number;
  postLamports: number;
  /** Signed delta in lamports. */
  deltaLamports: number;
}

// ---------------------------------------------------------------------------
// Decode result and error
// ---------------------------------------------------------------------------

export interface DecodeResult {
  overview: TransactionOverview;
  instructions: InstructionNode[];
  tokenDeltas: TokenBalanceDelta[];
  solDeltas: SolBalanceDelta[];
  logs: string[];
}

export type DecodeErrorCode =
  | "invalid_signature"
  | "not_found"
  | "invalid_rpc_url"
  | "rpc_error"
  | "timeout"
  | "internal";

export interface DecodeError {
  code: DecodeErrorCode;
  message: string;
}
