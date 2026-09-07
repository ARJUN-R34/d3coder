import type {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import type { InstructionNode } from "./types";

const LAMPORTS_PER_SOL = 1_000_000_000n;
const NATIVE_MINT = "So11111111111111111111111111111111111111112";

type RawInstruction = ParsedInstruction | PartiallyDecodedInstruction;

interface ParsedIx {
  type: string;
  info: Record<string, unknown>;
}

function lamportsToUiAmountString(lamports: bigint): string {
  const sign = lamports < 0n ? "-" : "";
  const abs = lamports < 0n ? -lamports : lamports;
  const whole = abs / LAMPORTS_PER_SOL;
  const frac = abs % LAMPORTS_PER_SOL;
  if (frac === 0n) {
    return `${sign}${whole.toString()}`;
  }
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}.${fracStr}`;
}

function toLamports(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function asPubkey(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getParsed(ix: RawInstruction): ParsedIx | null {
  if (!("parsed" in ix) || ix.parsed == null) return null;
  if (typeof ix.parsed !== "object" || !("type" in ix.parsed)) return null;
  const parsed = ix.parsed as { type: unknown; info?: unknown };
  return {
    type: String(parsed.type),
    info:
      parsed.info && typeof parsed.info === "object"
        ? (parsed.info as Record<string, unknown>)
        : {},
  };
}

/**
 * Flattened account key order matching `meta.preBalances` / `postBalances`:
 * static message keys, then ALT writable, then ALT readonly.
 */
export function flattenAccountKeys(rawTx: ParsedTransactionWithMeta): string[] {
  const staticKeys = rawTx.transaction.message.accountKeys.map((key) =>
    key.pubkey.toBase58(),
  );
  const loaded = rawTx.meta?.loadedAddresses;
  if (!loaded) return staticKeys;
  return [
    ...staticKeys,
    ...loaded.writable.map((key) => key.toBase58()),
    ...loaded.readonly.map((key) => key.toBase58()),
  ];
}

function applyNativeTransfer(
  balances: Map<string, bigint>,
  info: Record<string, unknown>,
  nativeAccounts: Set<string>,
): void {
  const source = asPubkey(info.source);
  const destination = asPubkey(info.destination);
  if (!source || !destination) return;

  const mint = asPubkey(info.mint);
  const isNative =
    mint === NATIVE_MINT ||
    (mint == null && nativeAccounts.has(source) && nativeAccounts.has(destination));
  if (!isNative) return;

  const tokenAmount =
    info.tokenAmount && typeof info.tokenAmount === "object"
      ? (info.tokenAmount as Record<string, unknown>)
      : null;
  const amount = toLamports(tokenAmount?.amount ?? info.amount);
  if (amount == null) return;

  balances.set(source, (balances.get(source) ?? 0n) - amount);
  balances.set(destination, (balances.get(destination) ?? 0n) + amount);
}

function applyParsedInstruction(
  balances: Map<string, bigint>,
  parsed: ParsedIx,
  nativeAccounts: Set<string>,
): bigint | null {
  const { type, info } = parsed;

  switch (type) {
    case "closeAccount": {
      const account = asPubkey(info.account);
      const destination = asPubkey(info.destination);
      if (!account || !destination) return null;
      const amount = balances.get(account) ?? 0n;
      balances.set(destination, (balances.get(destination) ?? 0n) + amount);
      balances.set(account, 0n);
      return amount;
    }
    case "transfer": {
      // System Program transfer uses `lamports`; SPL Token transfer uses `amount`.
      const lamports = toLamports(info.lamports);
      if (lamports != null) {
        const source = asPubkey(info.source);
        const destination = asPubkey(info.destination);
        if (source && destination) {
          balances.set(source, (balances.get(source) ?? 0n) - lamports);
          balances.set(destination, (balances.get(destination) ?? 0n) + lamports);
        }
        return null;
      }
      applyNativeTransfer(balances, info, nativeAccounts);
      return null;
    }
    case "transferChecked":
      applyNativeTransfer(balances, info, nativeAccounts);
      return null;
    case "createAccount":
    case "createAccountWithSeed": {
      const lamports = toLamports(info.lamports);
      const source = asPubkey(info.source);
      const newAccount = asPubkey(info.newAccount);
      if (lamports == null || !source || !newAccount) return null;
      balances.set(source, (balances.get(source) ?? 0n) - lamports);
      balances.set(newAccount, (balances.get(newAccount) ?? 0n) + lamports);
      return null;
    }
    default:
      return null;
  }
}

/**
 * Walks instructions in execution order and records SOL moved by
 * `closeAccount` (jsonParsed omits this). Keys match InstructionNode.id.
 */
export function computeCloseAccountAmounts(
  rawTx: ParsedTransactionWithMeta,
): Map<string, { amount: string; lamports: string }> {
  const recorded = new Map<string, { amount: string; lamports: string }>();
  const accountKeys = flattenAccountKeys(rawTx);
  const preBalances = rawTx.meta?.preBalances ?? [];
  const balances = new Map<string, bigint>();

  for (let i = 0; i < accountKeys.length; i++) {
    balances.set(accountKeys[i], BigInt(preBalances[i] ?? 0));
  }

  const nativeAccounts = new Set<string>();
  for (const balance of [
    ...(rawTx.meta?.preTokenBalances ?? []),
    ...(rawTx.meta?.postTokenBalances ?? []),
  ]) {
    if (balance.mint !== NATIVE_MINT) continue;
    const pubkey = accountKeys[balance.accountIndex];
    if (pubkey) nativeAccounts.add(pubkey);
  }

  const innerByParent = new Map<number, RawInstruction[]>();
  for (const group of rawTx.meta?.innerInstructions ?? []) {
    innerByParent.set(group.index, group.instructions);
  }

  const topLevel = rawTx.transaction.message.instructions;

  const recordIfClose = (id: string, ix: RawInstruction) => {
    const parsed = getParsed(ix);
    if (!parsed) return;
    const closedLamports = applyParsedInstruction(
      balances,
      parsed,
      nativeAccounts,
    );
    if (parsed.type !== "closeAccount" || closedLamports == null) return;
    recorded.set(id, {
      amount: `${lamportsToUiAmountString(closedLamports)} SOL`,
      lamports: closedLamports.toString(),
    });
  };

  topLevel.forEach((ix, topLevelIndex) => {
    recordIfClose(String(topLevelIndex), ix);
    const inners = innerByParent.get(topLevelIndex) ?? [];
    inners.forEach((innerIx, innerIndex) => {
      recordIfClose(`${topLevelIndex}.${innerIndex}`, innerIx);
    });
  });

  return recorded;
}

function walkNodes(
  nodes: InstructionNode[],
  visit: (node: InstructionNode) => void,
): void {
  for (const node of nodes) {
    visit(node);
    walkNodes(node.children, visit);
  }
}

/**
 * Attaches derived `amount` / `lamports` onto `closeAccount` parsed info.
 * Does not overwrite fields already present from jsonParsed.
 */
export function enrichInstructionAmounts(
  tree: InstructionNode[],
  rawTx: ParsedTransactionWithMeta,
): InstructionNode[] {
  const amounts = computeCloseAccountAmounts(rawTx);

  walkNodes(tree, (node) => {
    if (!node.parsed || node.parsed.type !== "closeAccount") return;
    const extra = amounts.get(node.id);
    if (!extra) return;
    const info = node.parsed.info;
    node.parsed.info = {
      ...(info.amount == null ? { amount: extra.amount } : {}),
      ...(info.lamports == null ? { lamports: extra.lamports } : {}),
      ...info,
    };
  });

  return tree;
}

/** Human-readable amount for a parsed instruction snapshot, if present. */
export function getParsedAmountLabel(
  info: Record<string, unknown> | undefined,
): string | null {
  if (!info) return null;
  if (typeof info.amount === "string" && info.amount.length > 0) {
    return info.amount;
  }
  const tokenAmount =
    info.tokenAmount && typeof info.tokenAmount === "object"
      ? (info.tokenAmount as Record<string, unknown>)
      : null;
  if (typeof tokenAmount?.uiAmountString === "string") {
    return asPubkey(info.mint) === NATIVE_MINT
      ? `${tokenAmount.uiAmountString} SOL`
      : tokenAmount.uiAmountString;
  }
  const lamports = toLamports(info.lamports);
  if (lamports != null) {
    return `${lamportsToUiAmountString(lamports)} SOL`;
  }
  return null;
}
