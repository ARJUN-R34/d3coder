"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RpcInputProps {
  value: string;
  onChange: (rpc: string) => void;
  disabled?: boolean;
}

function isValidHttpUrl(url: string): boolean {
  if (!url) return true; // empty is valid (field is optional)
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function RpcInput({ value, onChange, disabled }: RpcInputProps) {
  const [touched, setTouched] = useState(false);

  const isInvalid = touched && value.length > 0 && !isValidHttpUrl(value);

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="rpc-input"
        className="text-xs text-muted-foreground font-medium"
      >
        Custom RPC URL{" "}
        <span className="text-muted-foreground/60">(optional)</span>
      </label>
      <Input
        id="rpc-input"
        type="url"
        placeholder="https://my-rpc.example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? "rpc-input-error" : undefined}
        className={cn(
          "bg-white/5 border-white/10 backdrop-blur-sm font-mono text-sm",
          "placeholder:text-muted-foreground/40",
          "focus-visible:ring-ring",
          isInvalid && "border-destructive focus-visible:ring-destructive/50"
        )}
      />
      {isInvalid && (
        <p id="rpc-input-error" className="text-xs text-destructive" role="alert">
          Must be a valid http:// or https:// URL.
        </p>
      )}
    </div>
  );
}
