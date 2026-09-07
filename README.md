# Solana Transaction Decoder

Paste a Solana transaction signature to explore its full instruction tree (including inner/CPI calls), balance deltas, program labels, and logs — all decoded server-side through a proxied RPC call.

## What it does

- Decodes any Solana transaction by signature (mainnet-beta, devnet, testnet)
- Shows a nested instruction tree with human-readable program labels
- Displays token and SOL balance deltas
- Highlights ALT-resolved accounts
- Renders collapsible log messages

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and fill in your RPC URL:

```
SOLANA_RPC_URL=https://your-rpc-provider.com/your-api-key
```

If `SOLANA_RPC_URL` is not set, the app falls back to the public cluster default for the selected network. The RPC endpoint is only used server-side — it never reaches the client.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript + Tailwind CSS v4
- shadcn/ui (Radix primitives, new-york style)
- `@solana/web3.js` for RPC access
