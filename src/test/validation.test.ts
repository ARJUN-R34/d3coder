import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import { validateRpcUrl, validateSignature } from "@/lib/solana/validation";

/** Builds a valid 64-byte signature encoded as base58 (~87 chars). */
function makeValidSignature(seed = 1): string {
  const bytes = Buffer.alloc(64, seed);
  return bs58.encode(bytes);
}

describe("validateSignature (T-1)", () => {
  it("accepts valid 87-char base58 signatures", () => {
    const sig87 = makeValidSignature(1);
    expect(sig87.length).toBe(87);
    expect(validateSignature(sig87)).toBe(true);
  });

  it("accepts valid 88-char base58 signatures", () => {
    // 0xff repeated yields an 88-char encoding for 64 bytes
    const sig88 = bs58.encode(Buffer.alloc(64, 0xff));
    expect(sig88.length).toBe(88);
    expect(validateSignature(sig88)).toBe(true);
  });

  it("rejects too-short strings", () => {
    expect(validateSignature("abc")).toBe(false);
    expect(validateSignature(makeValidSignature().slice(0, 50))).toBe(false);
  });

  it("rejects too-long strings", () => {
    expect(validateSignature(makeValidSignature() + "extra")).toBe(false);
    expect(validateSignature("A".repeat(120))).toBe(false);
  });

  it("rejects wrong charset (non-base58 characters)", () => {
    const invalid = makeValidSignature().replace("V", "0");
    expect(invalid).toContain("0");
    expect(validateSignature(invalid)).toBe(false);
    expect(validateSignature("IlO0")).toBe(false);
  });

  it("rejects empty and non-string inputs", () => {
    expect(validateSignature("")).toBe(false);
    expect(validateSignature(null as unknown as string)).toBe(false);
    expect(validateSignature(undefined as unknown as string)).toBe(false);
  });
});

describe("validateRpcUrl (T-1 / T-4 SSRF guard)", () => {
  it("accepts valid https external URLs", () => {
    expect(validateRpcUrl("https://api.mainnet-beta.solana.com")).toBe(true);
    expect(validateRpcUrl("https://rpc.helius.xyz/?api-key=abc")).toBe(true);
    expect(validateRpcUrl("http://solana-rpc.example.com/v1")).toBe(true);
  });

  it("rejects localhost", () => {
    expect(validateRpcUrl("http://localhost:8899")).toBe(false);
    expect(validateRpcUrl("https://localhost/rpc")).toBe(false);
  });

  it("rejects 127.0.0.1", () => {
    expect(validateRpcUrl("http://127.0.0.1:8899")).toBe(false);
    expect(validateRpcUrl("https://127.0.0.1")).toBe(false);
  });

  it("rejects 192.168.x private ranges", () => {
    expect(validateRpcUrl("http://192.168.1.1:8899")).toBe(false);
    expect(validateRpcUrl("https://192.168.0.50/rpc")).toBe(false);
  });

  it("rejects other internal/private hosts", () => {
    expect(validateRpcUrl("http://10.0.0.5:8899")).toBe(false);
    expect(validateRpcUrl("http://172.16.0.1")).toBe(false);
    expect(validateRpcUrl("http://169.254.169.254")).toBe(false);
    expect(validateRpcUrl("http://internalhost")).toBe(false);
    expect(validateRpcUrl("http://printer.local")).toBe(false);
  });

  it("rejects file:// and malformed URLs", () => {
    expect(validateRpcUrl("file:///etc/passwd")).toBe(false);
    expect(validateRpcUrl("not-a-url")).toBe(false);
    expect(validateRpcUrl("ftp://rpc.example.com")).toBe(false);
    expect(validateRpcUrl("")).toBe(false);
  });
});
