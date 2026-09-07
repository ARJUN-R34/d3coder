/**
 * GET /api/transaction?signature=&cluster=&rpc=
 * POST /api/transaction { signature, cluster, rpc? }
 *
 * Server-side only. Never leaks RPC endpoint or secrets to the client.
 *
 * Error taxonomy → HTTP codes:
 *   invalid_signature | invalid_rpc_url → 400
 *   not_found                           → 404
 *   rpc_error                           → 502
 *   timeout                             → 504
 *   internal                            → 500
 */

import { NextRequest, NextResponse } from "next/server";
import type { DecodeError, DecodeResult } from "@/lib/solana/types";
import type { Cluster } from "@/lib/solana/types";
import { validateSignature, validateRpcUrl } from "@/lib/solana/validation";
import { resolveEndpoint } from "@/lib/solana/endpoints";
import { getTransaction } from "@/lib/solana/rpc";
import { decodeTransaction } from "@/lib/solana/decode";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CLUSTERS = new Set<Cluster>(["mainnet-beta", "devnet", "testnet"]);

function isValidCluster(value: unknown): value is Cluster {
  return typeof value === "string" && VALID_CLUSTERS.has(value as Cluster);
}

function errorResponse(
  code: DecodeError["code"],
  message: string,
  status: number,
): NextResponse<DecodeError> {
  return NextResponse.json<DecodeError>({ code, message }, { status });
}

function okResponse(result: DecodeResult): NextResponse<DecodeResult> {
  return NextResponse.json<DecodeResult>(result, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// Shared decode logic
// ---------------------------------------------------------------------------

async function handleDecode(params: {
  signature: string | null;
  cluster: string | null;
  rpc: string | null | undefined;
}): Promise<NextResponse<DecodeResult | DecodeError>> {
  const { signature, cluster, rpc } = params;

  // --- Validate signature ---
  if (!signature) {
    return errorResponse(
      "invalid_signature",
      "Missing required parameter: signature.",
      400,
    );
  }
  if (!validateSignature(signature)) {
    return errorResponse(
      "invalid_signature",
      "Invalid signature: must be a base58-encoded 64-byte transaction signature.",
      400,
    );
  }

  // --- Validate cluster ---
  if (!isValidCluster(cluster)) {
    return errorResponse(
      "invalid_signature",
      `Invalid cluster. Must be one of: mainnet-beta, devnet, testnet.`,
      400,
    );
  }

  // --- Validate custom RPC URL ---
  if (rpc) {
    if (!validateRpcUrl(rpc)) {
      return errorResponse(
        "invalid_rpc_url",
        "Invalid RPC URL: must be a valid http/https URL with an external host.",
        400,
      );
    }
  }

  const endpoint = resolveEndpoint(cluster, rpc ?? undefined);

  // --- Fetch transaction ---
  let rawTx;
  try {
    rawTx = await getTransaction(endpoint, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Distinguish timeout from other RPC errors
    if (
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("timed out")
    ) {
      return errorResponse(
        "timeout",
        "The RPC request timed out. Try again or use a different RPC endpoint.",
        504,
      );
    }

    // Structured RPC errors (e.g. 403, non-200) land here
    return errorResponse(
      "rpc_error",
      "The RPC request failed. Check the endpoint or try again.",
      502,
    );
  }

  // --- Not found ---
  if (rawTx === null) {
    return errorResponse(
      "not_found",
      "Transaction not found. It may not have been confirmed, or the signature is incorrect.",
      404,
    );
  }

  // --- Decode ---
  try {
    const result = decodeTransaction(signature, rawTx);
    return okResponse(result);
  } catch (error) {
    // Structured decode errors; should not happen on valid RPC data,
    // but guard defensively.
    console.error("[transaction/route] decode error:", error);
    return errorResponse(
      "internal",
      "Failed to decode transaction. Please report this.",
      500,
    );
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
): Promise<NextResponse<DecodeResult | DecodeError>> {
  const searchParams = request.nextUrl.searchParams;

  return handleDecode({
    signature: searchParams.get("signature"),
    cluster: searchParams.get("cluster"),
    rpc: searchParams.get("rpc"),
  });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<DecodeResult | DecodeError>> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(
      "internal",
      "Request body must be valid JSON.",
      400,
    );
  }

  return handleDecode({
    signature: typeof body.signature === "string" ? body.signature : null,
    cluster: typeof body.cluster === "string" ? body.cluster : null,
    rpc: typeof body.rpc === "string" ? body.rpc : undefined,
  });
}
