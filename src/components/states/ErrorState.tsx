import React from "react";
import {
  AlertTriangleIcon,
  WifiOffIcon,
  ClockIcon,
  ServerCrashIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import type { DecodeErrorCode } from "@/lib/solana/types";

interface ErrorConfig {
  icon: React.ElementType;
  title: string;
  suggestion: string;
  iconClass: string;
  bgClass: string;
  borderClass: string;
}

function getErrorConfig(code: DecodeErrorCode): ErrorConfig {
  switch (code) {
    case "invalid_signature":
      return {
        icon: ShieldAlertIcon,
        title: "Invalid signature",
        suggestion:
          "Check that the signature is base58 encoded and approximately 87–88 characters long.",
        iconClass: "text-amber-400/80",
        bgClass: "bg-amber-500/10",
        borderClass: "border-amber-500/20",
      };
    case "invalid_rpc_url":
      return {
        icon: ShieldAlertIcon,
        title: "Invalid RPC URL",
        suggestion:
          "The custom RPC URL must be a valid http:// or https:// address pointing to an external host.",
        iconClass: "text-amber-400/80",
        bgClass: "bg-amber-500/10",
        borderClass: "border-amber-500/20",
      };
    case "not_found":
      return {
        icon: AlertTriangleIcon,
        title: "Transaction not found",
        suggestion:
          "The transaction may not be confirmed yet or the signature is incorrect. Try a different cluster.",
        iconClass: "text-yellow-400/80",
        bgClass: "bg-yellow-500/10",
        borderClass: "border-yellow-500/20",
      };
    case "rpc_error":
      return {
        icon: WifiOffIcon,
        title: "RPC request failed",
        suggestion:
          "The Solana RPC endpoint returned an error. Try a custom RPC URL or wait and retry.",
        iconClass: "text-red-400/80",
        bgClass: "bg-red-500/10",
        borderClass: "border-red-500/20",
      };
    case "timeout":
      return {
        icon: ClockIcon,
        title: "Request timed out",
        suggestion:
          "The RPC endpoint did not respond in time. Try a different cluster or custom RPC.",
        iconClass: "text-orange-400/80",
        bgClass: "bg-orange-500/10",
        borderClass: "border-orange-500/20",
      };
    case "internal":
      return {
        icon: ServerCrashIcon,
        title: "Internal error",
        suggestion:
          "An unexpected error occurred while decoding the transaction. Please try again.",
        iconClass: "text-red-400/80",
        bgClass: "bg-red-500/10",
        borderClass: "border-red-500/20",
      };
    default: {
      // Exhaustive check — TypeScript will error if a new code is added without handling it.
      const _exhaustive: never = code;
      return {
        icon: AlertTriangleIcon,
        title: "Unknown error",
        suggestion: `Unhandled error code: ${_exhaustive}. Please report this.`,
        iconClass: "text-red-400/80",
        bgClass: "bg-red-500/10",
        borderClass: "border-red-500/20",
      };
    }
  }
}

interface ErrorStateProps {
  code: DecodeErrorCode;
  message?: string;
}

export function ErrorState({ code, message }: ErrorStateProps) {
  const config = getErrorConfig(code);
  const Icon = config.icon;

  return (
    <GlassPanel
      depth="shallow"
      className="p-10 text-center"
      role="alert"
      aria-label="Decode error"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${config.bgClass} border ${config.borderClass}`}
        >
          <Icon className={`h-6 w-6 ${config.iconClass}`} />
        </div>
        <div>
          <p className="text-base font-medium text-foreground/80">
            {config.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {message ?? config.suggestion}
          </p>
        </div>
        {message && message !== config.suggestion && (
          <p className="text-xs text-muted-foreground/50 max-w-md">
            {config.suggestion}
          </p>
        )}
      </div>
    </GlassPanel>
  );
}
