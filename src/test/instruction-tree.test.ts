import { describe, expect, it } from "vitest";
import { buildInstructionTree } from "@/lib/solana/instruction-tree";
import type { InstructionNode } from "@/lib/solana/types";
import txFixture from "./fixtures/tx-with-inner.json";
import {
  hydrateParsedTransaction,
  type JsonTransactionFixture,
} from "./helpers/fixture-loader";

function collectIds(nodes: InstructionNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    ids.push(...collectIds(node.children));
  }
  return ids;
}

describe("buildInstructionTree (T-2)", () => {
  const rawTx = hydrateParsedTransaction(txFixture as JsonTransactionFixture);
  const tree = buildInstructionTree(rawTx);

  it("builds three top-level instructions in order", () => {
    expect(tree).toHaveLength(3);
    expect(tree.map((n) => n.id)).toEqual(["0", "1", "2"]);
    expect(tree.map((n) => n.depth)).toEqual([0, 0, 0]);
    expect(tree.map((n) => n.index)).toEqual([0, 1, 2]);
  });

  it("labels top-level programs correctly", () => {
    expect(tree[0].program.label).toBe("Compute Budget");
    expect(tree[0].program.category).toBe("compute-budget");
    expect(tree[1].program.known).toBe(false);
    expect(tree[1].program.category).toBe("unknown");
    expect(tree[2].program.label).toBe("Memo");
    expect(tree[2].program.category).toBe("memo");
  });

  it("nests inner instructions under parent index 1", () => {
    const swapNode = tree[1];
    expect(swapNode.children).toHaveLength(2);

    const [firstInner, secondInner] = swapNode.children;
    expect(firstInner.id).toBe("1.0");
    expect(firstInner.depth).toBe(1);
    expect(firstInner.program.label).toBe("SPL Token");
    expect(firstInner.parsed?.type).toBe("transfer");

    expect(secondInner.id).toBe("1.2");
    expect(secondInner.depth).toBe(1);
    expect(secondInner.program.label).toBe("System Program");
  });

  it("reconstructs stackHeight-based grandchild nesting", () => {
    const firstInner = tree[1].children[0];
    expect(firstInner.children).toHaveLength(1);

    const grandchild = firstInner.children[0];
    expect(grandchild.id).toBe("1.1");
    expect(grandchild.depth).toBe(2);
    expect(grandchild.parsed).toBeNull();
    expect(grandchild.program.category).toBe("token");
  });

  it("uses stable path id keys across the full tree", () => {
    expect(collectIds(tree)).toEqual(["0", "1", "1.0", "1.1", "1.2", "2"]);
  });

  it("counts total instructions including inner CPIs", () => {
    const topLevel = tree.length;
    const innerCount = tree.reduce(
      (sum, node) => sum + collectIds(node.children).length,
      0,
    );
    expect(topLevel).toBe(3);
    expect(innerCount).toBe(3);
    expect(topLevel + innerCount).toBe(6);
  });
});
