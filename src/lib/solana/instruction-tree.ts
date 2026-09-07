import type {
  ParsedTransactionWithMeta,
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import type { AccountRef, InstructionNode } from "./types";
import { lookupProgram } from "./program-registry";

type RawInstruction = ParsedInstruction | PartiallyDecodedInstruction;

/**
 * Builds a nested InstructionNode tree from a parsed transaction.
 *
 * Top-level instructions come from `transaction.message.instructions`.
 * Inner instructions (CPI calls) from `meta.innerInstructions` are nested
 * under their parent using the `index` field.
 *
 * Depth uses `stackHeight` when present; otherwise all inner instructions
 * are nested flat under their parent (depth = parent.depth + 1).
 */
export function buildInstructionTree(
  rawTx: ParsedTransactionWithMeta,
): InstructionNode[] {
  const topLevelInstructions = rawTx.transaction.message.instructions;
  const innerInstructions = rawTx.meta?.innerInstructions ?? [];
  const staticAccountKeys = rawTx.transaction.message.accountKeys;
  const loadedAddresses = rawTx.meta?.loadedAddresses;

  // Build a set of lookup-table pubkeys for O(1) tagging
  const lookupTablePubkeys = new Set<string>();
  if (loadedAddresses) {
    for (const key of loadedAddresses.writable) {
      lookupTablePubkeys.add(key.toBase58());
    }
    for (const key of loadedAddresses.readonly) {
      lookupTablePubkeys.add(key.toBase58());
    }
  }

  // Index inner instructions by parent top-level index
  const innerByParent = new Map<
    number,
    Array<ParsedInstruction | PartiallyDecodedInstruction>
  >();
  for (const group of innerInstructions) {
    innerByParent.set(group.index, group.instructions);
  }

  return topLevelInstructions.map((topLevelIx, topLevelIndex) => {
    const parentId = String(topLevelIndex);
    const parentNode = buildNode(
      topLevelIx,
      topLevelIndex,
      0,
      parentId,
      staticAccountKeys,
      lookupTablePubkeys,
    );

    const innerGroup = innerByParent.get(topLevelIndex) ?? [];
    parentNode.children = buildInnerChildren(
      innerGroup,
      parentId,
      1,
      staticAccountKeys,
      lookupTablePubkeys,
    );

    return parentNode;
  });
}

/**
 * Recursively build children from a flat list of inner instructions.
 * When `stackHeight` is present on items, use it to reconstruct nesting depth.
 * Otherwise flatten all under the parent at `baseDepth`.
 */
function buildInnerChildren(
  instructions: RawInstruction[],
  parentId: string,
  baseDepth: number,
  staticAccountKeys: ParsedTransactionWithMeta["transaction"]["message"]["accountKeys"],
  lookupTablePubkeys: Set<string>,
): InstructionNode[] {
  if (instructions.length === 0) return [];

  const hasStackHeight = instructions.some(
    (ix) => "stackHeight" in ix && typeof ix.stackHeight === "number",
  );

  if (!hasStackHeight) {
    // Flat nesting under parent
    return instructions.map((ix, i) => {
      const nodeId = `${parentId}.${i}`;
      const node = buildNode(
        ix,
        i,
        baseDepth,
        nodeId,
        staticAccountKeys,
        lookupTablePubkeys,
      );
      node.children = [];
      return node;
    });
  }

  // Reconstruct nesting using stackHeight
  // stackHeight === 2 means direct child of top-level (depth 0),
  // stackHeight === 3 means grandchild, etc.
  const roots: InstructionNode[] = [];
  const stack: InstructionNode[] = [];

  instructions.forEach((ix, i) => {
    const rawStackHeight =
      "stackHeight" in ix && typeof ix.stackHeight === "number"
        ? (ix.stackHeight as number)
        : 2;
    const depth = rawStackHeight - 1; // normalize: stackHeight 2 → depth 1
    const nodeId = `${parentId}.${i}`;

    const node = buildNode(
      ix,
      i,
      depth,
      nodeId,
      staticAccountKeys,
      lookupTablePubkeys,
    );
    node.children = [];

    // Pop stack until we find the correct parent depth
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return roots;
}

function buildNode(
  ix: RawInstruction,
  index: number,
  depth: number,
  id: string,
  staticAccountKeys: ParsedTransactionWithMeta["transaction"]["message"]["accountKeys"],
  lookupTablePubkeys: Set<string>,
): InstructionNode {
  const programId = ix.programId.toBase58();
  const program = lookupProgram(programId);

  if ("parsed" in ix && ix.parsed != null) {
    // ParsedInstruction — has structured parsed data
    const parsedIx = ix as ParsedInstruction;
    return {
      id,
      depth,
      index,
      program,
      parsed:
        typeof parsedIx.parsed === "object" &&
        parsedIx.parsed !== null &&
        "type" in parsedIx.parsed
          ? {
              type: String(parsedIx.parsed.type),
              info: (parsedIx.parsed.info ?? {}) as Record<string, unknown>,
            }
          : null,
      raw: {
        accounts: buildAccountRefs(
          Array.isArray(parsedIx.accounts)
            ? (parsedIx.accounts as string[])
            : [],
          staticAccountKeys,
          lookupTablePubkeys,
        ),
        data: "",
      },
      children: [],
    };
  }

  // PartiallyDecodedInstruction
  const partialIx = ix as PartiallyDecodedInstruction;
  return {
    id,
    depth,
    index,
    program,
    parsed: null,
    raw: {
      accounts: partialIx.accounts.map((key) => {
        const pubkey = key.toBase58();
        const staticEntry = staticAccountKeys.find(
          (k) => k.pubkey.toBase58() === pubkey,
        );
        return {
          pubkey,
          isSigner: staticEntry?.signer ?? false,
          isWritable: staticEntry?.writable ?? false,
          source: lookupTablePubkeys.has(pubkey) ? "lookup-table" : "static",
        } satisfies AccountRef;
      }),
      data: partialIx.data,
    },
    children: [],
  };
}

/**
 * Builds AccountRef list from string pubkeys (used for ParsedInstructions
 * where accounts are already resolved to strings by the RPC).
 */
function buildAccountRefs(
  accountPubkeys: string[],
  staticAccountKeys: ParsedTransactionWithMeta["transaction"]["message"]["accountKeys"],
  lookupTablePubkeys: Set<string>,
): AccountRef[] {
  return accountPubkeys.map((pubkey) => {
    const staticEntry = staticAccountKeys.find(
      (k) => k.pubkey.toBase58() === pubkey,
    );
    return {
      pubkey,
      isSigner: staticEntry?.signer ?? false,
      isWritable: staticEntry?.writable ?? false,
      source: lookupTablePubkeys.has(pubkey) ? "lookup-table" : "static",
    } satisfies AccountRef;
  });
}
