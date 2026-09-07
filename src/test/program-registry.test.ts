import { describe, expect, it } from "vitest";
import { lookupProgram } from "@/lib/solana/program-registry";

describe("lookupProgram (T-3)", () => {
  const knownCases = [
    {
      programId: "11111111111111111111111111111111",
      label: "System Program",
      category: "system",
    },
    {
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      label: "SPL Token",
      category: "token",
    },
    {
      programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      label: "Token-2022",
      category: "token",
    },
    {
      programId: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ",
      label: "Associated Token Account",
      category: "ata",
    },
    {
      programId: "ComputeBudget111111111111111111111111111111",
      label: "Compute Budget",
      category: "compute-budget",
    },
    {
      programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      label: "Memo",
      category: "memo",
    },
    {
      programId: "Stake11111111111111111111111111111111111111",
      label: "Stake",
      category: "stake",
    },
    {
      programId: "Vote111111111111111111111111111111111111111p",
      label: "Vote",
      category: "vote",
    },
    {
      programId: "AddressLookupTab1e1111111111111111111111111",
      label: "Address Lookup Table",
      category: "alt",
    },
    {
      programId: "BPFLoaderUpgradeab1e11111111111111111111111",
      label: "BPF Upgradeable Loader",
      category: "loader",
    },
  ] as const;

  it.each(knownCases)(
    "maps $programId to $label ($category)",
    ({ programId, label, category }) => {
      const info = lookupProgram(programId);
      expect(info.programId).toBe(programId);
      expect(info.label).toBe(label);
      expect(info.category).toBe(category);
      expect(info.known).toBe(true);
    },
  );

  it("returns safe fallback for unknown program IDs without throwing", () => {
    const unknownId = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
    expect(() => lookupProgram(unknownId)).not.toThrow();

    const info = lookupProgram(unknownId);
    expect(info.programId).toBe(unknownId);
    expect(info.known).toBe(false);
    expect(info.category).toBe("unknown");
    expect(info.label).toBe("JUP6…TaV4");
  });

  it("handles short unknown IDs without truncation artifacts", () => {
    const shortId = "ShortProgId";
    const info = lookupProgram(shortId);
    expect(info.label).toBe(shortId);
    expect(info.known).toBe(false);
  });
});
