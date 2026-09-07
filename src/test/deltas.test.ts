import { describe, expect, it } from "vitest";
import { computeSolDeltas, computeTokenDeltas } from "@/lib/solana/deltas";
import txFixture from "./fixtures/tx-with-inner.json";
import {
  hydrateParsedTransaction,
  type JsonTransactionFixture,
} from "./helpers/fixture-loader";

describe("computeTokenDeltas / computeSolDeltas (T-5)", () => {
  const rawTx = hydrateParsedTransaction(txFixture as JsonTransactionFixture);

  it("computes signed token balance deltas from pre/post meta", () => {
    const deltas = computeTokenDeltas(rawTx);

    expect(deltas).toHaveLength(2);

    const senderDelta = deltas.find(
      (d) => d.owner === "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    );
    expect(senderDelta).toMatchObject({
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      preAmount: "10.5",
      postAmount: "5.5",
      deltaUi: "-5.000000",
      decimals: 6,
    });

    const receiverDelta = deltas.find(
      (d) => d.owner === "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    );
    expect(receiverDelta).toMatchObject({
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      preAmount: "0",
      postAmount: "5",
      deltaUi: "+5.000000",
      decimals: 6,
    });
  });

  it("computes signed SOL balance deltas for fee payer", () => {
    const deltas = computeSolDeltas(rawTx);

    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({
      account: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      preLamports: 10_000_000_000,
      postLamports: 9_999_945_000,
      deltaLamports: -55_000,
    });
  });

  it("returns empty arrays when balance meta is missing", () => {
    const emptyMetaTx = hydrateParsedTransaction({
      ...(txFixture as JsonTransactionFixture),
      meta: {
        ...(txFixture as JsonTransactionFixture).meta,
        preTokenBalances: undefined,
        postTokenBalances: undefined,
        preBalances: undefined,
        postBalances: undefined,
      },
    });

    expect(computeTokenDeltas(emptyMetaTx)).toEqual([]);
    expect(computeSolDeltas(emptyMetaTx)).toEqual([]);
  });
});
