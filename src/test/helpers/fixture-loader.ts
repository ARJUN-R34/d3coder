import {
  PublicKey,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";

type JsonAccountKey = {
  pubkey: string;
  signer: boolean;
  writable: boolean;
};

type JsonParsedInstruction = {
  programId: string;
  parsed: { type: string; info: Record<string, unknown> };
  accounts?: string[];
};

type JsonPartialInstruction = {
  programId: string;
  accounts: string[];
  data: string;
  stackHeight?: number;
};

type JsonInnerInstructionGroup = {
  index: number;
  instructions: Array<JsonParsedInstruction | JsonPartialInstruction>;
};

type JsonTokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
  };
};

export type JsonTransactionFixture = {
  slot: number;
  blockTime: number;
  version?: number | "legacy";
  meta: {
    err: unknown;
    fee: number;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: JsonTokenBalance[];
    postTokenBalances?: JsonTokenBalance[];
    innerInstructions?: JsonInnerInstructionGroup[];
    logMessages?: string[];
    computeUnitsConsumed?: number;
    loadedAddresses?: { writable: string[]; readonly: string[] };
  };
  transaction: {
    signatures: string[];
    message: {
      accountKeys: JsonAccountKey[];
      instructions: Array<JsonParsedInstruction | JsonPartialInstruction>;
    };
  };
};

function hydrateInstruction(
  ix: JsonParsedInstruction | JsonPartialInstruction,
): ParsedInstruction | PartiallyDecodedInstruction {
  if ("parsed" in ix) {
    return {
      programId: new PublicKey(ix.programId),
      parsed: ix.parsed,
      accounts: ix.accounts,
    } as unknown as ParsedInstruction;
  }

  const partial: PartiallyDecodedInstruction & { stackHeight?: number } = {
    programId: new PublicKey(ix.programId),
    accounts: ix.accounts.map((a) => new PublicKey(a)),
    data: ix.data,
  };

  if (ix.stackHeight != null) {
    partial.stackHeight = ix.stackHeight;
  }

  return partial;
}

/** Converts JSON fixture data into a web3.js ParsedTransactionWithMeta. */
export function hydrateParsedTransaction(
  raw: JsonTransactionFixture,
): ParsedTransactionWithMeta {
  const accountKeys = raw.transaction.message.accountKeys.map((k) => ({
    pubkey: new PublicKey(k.pubkey),
    signer: k.signer,
    writable: k.writable,
  }));

  const instructions = raw.transaction.message.instructions.map(hydrateInstruction);

  const innerInstructions = raw.meta.innerInstructions?.map((group) => ({
    index: group.index,
    instructions: group.instructions.map(hydrateInstruction),
  }));

  const loadedAddresses = raw.meta.loadedAddresses
    ? {
        writable: raw.meta.loadedAddresses.writable.map((a) => new PublicKey(a)),
        readonly: raw.meta.loadedAddresses.readonly.map((a) => new PublicKey(a)),
      }
    : undefined;

  return {
    slot: raw.slot,
    blockTime: raw.blockTime,
    version: raw.version === 0 ? 0 : undefined,
    meta: {
      err: raw.meta.err,
      fee: raw.meta.fee,
      preBalances: raw.meta.preBalances ?? [],
      postBalances: raw.meta.postBalances ?? [],
      preTokenBalances: raw.meta.preTokenBalances,
      postTokenBalances: raw.meta.postTokenBalances,
      innerInstructions,
      logMessages: raw.meta.logMessages,
      computeUnitsConsumed: raw.meta.computeUnitsConsumed,
      loadedAddresses,
    },
    transaction: {
      signatures: raw.transaction.signatures,
      message: {
        accountKeys,
        instructions,
        recentBlockhash: "fixture-blockhash",
      },
    },
  } as ParsedTransactionWithMeta;
}
