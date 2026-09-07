import { describe, expect, it } from "vitest";
import { decodeTransaction } from "@/lib/solana/decode";
import {
  computeCloseAccountAmounts,
  enrichInstructionAmounts,
} from "@/lib/solana/instruction-amounts";
import { buildInstructionTree } from "@/lib/solana/instruction-tree";
import {
  hydrateParsedTransaction,
  type JsonTransactionFixture,
} from "./helpers/fixture-loader";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const NATIVE_MINT = "So11111111111111111111111111111111111111112";
const DESTINATION = "13kfFWf29qqgjwWEpBSpLFTYK3zci3zvgByJ7WvwRboU";
const WSOL_ACCOUNT = "EW9diL91VgHY5i9qYScz53W3PihQPSnPoMtAKCo1Bs7J";
const WSOL_SOURCE = "3FQBMSr5vamHpHH73N9RdcqLc9HppUqsqbBfhUGYBRpT";
const OWNER = "D5YqVMoSxnqeZAKAUUE1Dm3bmjtdxQ5DCF356ozqN9cM";
const AGGREGATOR = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

const CLOSED_PRE_LAMPORTS = 2_840_437_699;
const WRAPPED_IN_LAMPORTS = 20_368_741;
const EXPECTED_CLOSE_LAMPORTS = CLOSED_PRE_LAMPORTS + WRAPPED_IN_LAMPORTS;

function baseAccountKeys() {
  return [
    { pubkey: DESTINATION, signer: true, writable: true },
    { pubkey: WSOL_SOURCE, signer: false, writable: true },
    { pubkey: WSOL_ACCOUNT, signer: false, writable: true },
    { pubkey: OWNER, signer: true, writable: false },
    { pubkey: TOKEN_PROGRAM, signer: false, writable: false },
    { pubkey: NATIVE_MINT, signer: false, writable: false },
    { pubkey: AGGREGATOR, signer: false, writable: false },
  ];
}

describe("closeAccount amount enrichment", () => {
  it("uses the account's pre-balance when closeAccount is top-level", () => {
    const rawTx = hydrateParsedTransaction({
      slot: 1,
      blockTime: 1,
      version: 0,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [1_000_000, 0, CLOSED_PRE_LAMPORTS, 0, 1, 1, 1],
        postBalances: [1_000_000 + CLOSED_PRE_LAMPORTS, 0, 0, 0, 1, 1, 1],
        innerInstructions: [],
      },
      transaction: {
        signatures: ["test"],
        message: {
          accountKeys: baseAccountKeys(),
          instructions: [
            {
              programId: TOKEN_PROGRAM,
              parsed: {
                type: "closeAccount",
                info: {
                  account: WSOL_ACCOUNT,
                  destination: DESTINATION,
                  owner: OWNER,
                },
              },
            },
          ],
        },
      },
    } as JsonTransactionFixture);

    const amounts = computeCloseAccountAmounts(rawTx);
    expect(amounts.get("0")).toEqual({
      amount: "2.840437699 SOL",
      lamports: String(CLOSED_PRE_LAMPORTS),
    });

    const tree = enrichInstructionAmounts(buildInstructionTree(rawTx), rawTx);
    expect(tree[0].parsed?.info.amount).toBe("2.840437699 SOL");
    expect(tree[0].parsed?.info.lamports).toBe(String(CLOSED_PRE_LAMPORTS));
    expect(tree[0].parsed?.info.account).toBe(WSOL_ACCOUNT);
  });

  it("includes WSOL transferred into the account before close in the same tx", () => {
    const rawTx = hydrateParsedTransaction({
      slot: 1,
      blockTime: 1,
      version: 0,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [
          1_979_658,
          100_000_000,
          CLOSED_PRE_LAMPORTS,
          0,
          1,
          1,
          1,
        ],
        postBalances: [
          1_979_658 + EXPECTED_CLOSE_LAMPORTS,
          100_000_000 - WRAPPED_IN_LAMPORTS,
          0,
          0,
          1,
          1,
          1,
        ],
        preTokenBalances: [
          {
            accountIndex: 1,
            mint: NATIVE_MINT,
            owner: OWNER,
            uiTokenAmount: {
              amount: "100000000",
              decimals: 9,
              uiAmount: 0.1,
              uiAmountString: "0.1",
            },
          },
          {
            accountIndex: 2,
            mint: NATIVE_MINT,
            owner: OWNER,
            uiTokenAmount: {
              amount: "2838398419",
              decimals: 9,
              uiAmount: 2.838398419,
              uiAmountString: "2.838398419",
            },
          },
        ],
        innerInstructions: [
          {
            index: 0,
            instructions: [
              {
                programId: TOKEN_PROGRAM,
                parsed: {
                  type: "transferChecked",
                  info: {
                    authority: OWNER,
                    source: WSOL_SOURCE,
                    destination: WSOL_ACCOUNT,
                    mint: NATIVE_MINT,
                    tokenAmount: {
                      amount: String(WRAPPED_IN_LAMPORTS),
                      decimals: 9,
                      uiAmount: 0.020368741,
                      uiAmountString: "0.020368741",
                    },
                  },
                },
              },
              {
                programId: TOKEN_PROGRAM,
                parsed: {
                  type: "closeAccount",
                  info: {
                    account: WSOL_ACCOUNT,
                    destination: DESTINATION,
                    owner: OWNER,
                  },
                },
              },
            ],
          },
        ],
      },
      transaction: {
        signatures: ["test"],
        message: {
          accountKeys: baseAccountKeys(),
          instructions: [
            {
              programId: AGGREGATOR,
              accounts: [DESTINATION, WSOL_ACCOUNT],
              data: "deadbeef",
              stackHeight: 1,
            },
          ],
        },
      },
    } as JsonTransactionFixture);

    const decoded = decodeTransaction("test-sig", rawTx);
    const closeNode = decoded.instructions[0].children.find(
      (node) => node.parsed?.type === "closeAccount",
    );

    expect(closeNode?.id).toBe("0.1");
    expect(closeNode?.parsed?.info.amount).toBe("2.86080644 SOL");
    expect(closeNode?.parsed?.info.lamports).toBe(
      String(EXPECTED_CLOSE_LAMPORTS),
    );
  });

  it("does not overwrite an amount already present in jsonParsed", () => {
    const rawTx = hydrateParsedTransaction({
      slot: 1,
      blockTime: 1,
      version: 0,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [0, 0, 2_039_280, 0, 1, 1, 1],
        postBalances: [2_039_280, 0, 0, 0, 1, 1, 1],
        innerInstructions: [],
      },
      transaction: {
        signatures: ["test"],
        message: {
          accountKeys: baseAccountKeys(),
          instructions: [
            {
              programId: TOKEN_PROGRAM,
              parsed: {
                type: "closeAccount",
                info: {
                  account: WSOL_ACCOUNT,
                  destination: DESTINATION,
                  owner: OWNER,
                  amount: "already-set",
                },
              },
            },
          ],
        },
      },
    } as JsonTransactionFixture);

    const tree = enrichInstructionAmounts(buildInstructionTree(rawTx), rawTx);
    expect(tree[0].parsed?.info.amount).toBe("already-set");
    expect(tree[0].parsed?.info.lamports).toBe("2039280");
  });
});
