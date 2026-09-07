import { afterEach, describe, expect, it, vi } from "vitest";
import { getClusterDefault, resolveEndpoint } from "@/lib/solana/endpoints";

describe("resolveEndpoint (T-4)", () => {
  const originalEnv = process.env.SOLANA_RPC_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SOLANA_RPC_URL;
    } else {
      process.env.SOLANA_RPC_URL = originalEnv;
    }
    vi.unstubAllEnvs();
  });

  it("prefers custom rpc when provided", () => {
    process.env.SOLANA_RPC_URL = "https://env-rpc.example.com";
    const custom = "https://custom-rpc.example.com/v1";

    expect(resolveEndpoint("mainnet-beta", custom)).toBe(custom);
    expect(resolveEndpoint("devnet", custom)).toBe(custom);
  });

  it("falls back to SOLANA_RPC_URL when custom rpc is absent", () => {
    process.env.SOLANA_RPC_URL = "https://env-rpc.example.com";
    expect(resolveEndpoint("mainnet-beta")).toBe("https://env-rpc.example.com");
    expect(resolveEndpoint("testnet")).toBe("https://env-rpc.example.com");
  });

  it("uses public cluster default when no custom rpc or env var", () => {
    delete process.env.SOLANA_RPC_URL;
    expect(resolveEndpoint("mainnet-beta")).toBe(
      "https://api.mainnet-beta.solana.com",
    );
    expect(resolveEndpoint("devnet")).toBe("https://api.devnet.solana.com");
    expect(resolveEndpoint("testnet")).toBe("https://api.testnet.solana.com");
  });

  it("exposes cluster defaults via getClusterDefault", () => {
    expect(getClusterDefault("mainnet-beta")).toBe(
      "https://api.mainnet-beta.solana.com",
    );
  });
});
