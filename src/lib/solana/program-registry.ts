import type { ProgramCategory, ProgramInfo } from "./types";

interface RegistryEntry {
  label: string;
  category: ProgramCategory;
}

/** Known Solana program registry. Keyed by base58 program ID. */
const PROGRAM_REGISTRY: Record<string, RegistryEntry> = {
  // System Program
  "11111111111111111111111111111111": {
    label: "System Program",
    category: "system",
  },

  // SPL Token
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: {
    label: "SPL Token",
    category: "token",
  },

  // Token-2022
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
    label: "Token-2022",
    category: "token",
  },

  // Associated Token Account Program
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ: {
    label: "Associated Token Account",
    category: "ata",
  },

  // Compute Budget
  ComputeBudget111111111111111111111111111111: {
    label: "Compute Budget",
    category: "compute-budget",
  },

  // Memo v1
  Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: {
    label: "Memo",
    category: "memo",
  },

  // Memo v2
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: {
    label: "Memo",
    category: "memo",
  },

  // Stake Program
  Stake11111111111111111111111111111111111111: {
    label: "Stake",
    category: "stake",
  },

  // Vote Program
  Vote111111111111111111111111111111111111111p: {
    label: "Vote",
    category: "vote",
  },

  // Address Lookup Table Program
  AddressLookupTab1e1111111111111111111111111: {
    label: "Address Lookup Table",
    category: "alt",
  },

  // BPF Loader (legacy)
  BPFLoader1111111111111111111111111111111111: {
    label: "BPF Loader",
    category: "loader",
  },

  // BPF Loader 2
  BPFLoader2111111111111111111111111111111111: {
    label: "BPF Loader 2",
    category: "loader",
  },

  // BPF Upgradeable Loader
  BPFLoaderUpgradeab1e11111111111111111111111: {
    label: "BPF Upgradeable Loader",
    category: "loader",
  },
};

/**
 * Looks up a program by its base58 ID.
 * Returns a ProgramInfo with known=true for registered programs,
 * or a safe fallback with a truncated address label for unknowns.
 */
export function lookupProgram(programId: string): ProgramInfo {
  const entry = PROGRAM_REGISTRY[programId];

  if (entry) {
    return {
      programId,
      label: entry.label,
      category: entry.category,
      known: true,
    };
  }

  // Unknown program — safe fallback with truncated ID
  return {
    programId,
    label: truncateProgramId(programId),
    category: "unknown",
    known: false,
  };
}

function truncateProgramId(programId: string): string {
  if (programId.length <= 12) return programId;
  return `${programId.slice(0, 4)}…${programId.slice(-4)}`;
}
