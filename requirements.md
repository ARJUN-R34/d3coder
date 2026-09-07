# transaction_decoder — Requirements

A Solana transaction signature decoder with a liquid-glass UI. Paste a transaction signature, fetch it via a server-side RPC call, and explore a fully nested instruction tree (top-level + inner/CPI) with human-readable program labels, balance deltas, and logs.

## 1. Scope

**In scope:** signature input + validation, server-side RPC fetch, full instruction extraction (incl. inner/CPI), decoded overview, nested instruction timeline, known-program labeling, parsed/raw views, token balance deltas, logs, ALT-resolved account distinction, liquid-glass design, cluster selection.

**Out of scope (explicit):** wallet connection, database, auth, Vercel linking, transaction sending/signing, multi-tx batch decoding, historical search/indexing.

## 2. Fixed stack (do not reopen)

| Concern | Decision |
|---|---|
| Framework | Next.js App Router (latest), Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Layout | `src/` dir, `@/*` alias |
| Scaffold | `npx shadcn@latest init --template next -d`; fallback `create-next-app` + `shadcn init` |
| UI kit | shadcn/ui — Radix (`--base radix`), new-york style |
| Theme | dark default (`<html className="dark">`), zinc palette, cyan/violet accent via `--color-primary` |
| Fonts | Geist; fix circular ref in `@theme inline`; font vars on `<html>` not `<body>` |
| Solana client | `@solana/web3.js` or `@solana/kit`; `getTransaction` w/ `encoding: "jsonParsed"`, `maxSupportedTransactionVersion: 0` |
| RPC access | Server-side Route Handler `src/app/api/transaction/route.ts` |
| Config | optional `SOLANA_RPC_URL` env; UI cluster selector (mainnet-beta / devnet / testnet) + optional custom RPC (validated http(s)) |
| Tests | Vitest (or scaffold's runner); mock `Connection.getTransaction` |

## 3. Functional requirements

### FR-1 — Signature input & validation
- Accept a Solana transaction signature: base58, ~87–88 chars.
- Validate on client before request: base58 charset + plausible decoded length (64 bytes). Reject with a designed inline error; do not fire the request.
- Server re-validates before hitting RPC (never trust client).

### FR-2 — RPC fetch (server-side only)
- Route Handler resolves the endpoint by precedence: validated custom RPC (from request) → `SOLANA_RPC_URL` env (only for its matching cluster) → public cluster default for the selected cluster.
- Calls `getTransaction(signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 })`.
- Distinguishes: found, not-found (`null` result), RPC/network error, invalid input, timeout.
- Custom RPC URLs are validated (must be http/https, well-formed) on both client and server; server guards against SSRF-style abuse by only accepting http(s) and rejecting obvious internal hosts (best-effort).

### FR-3 — Instruction extraction (core)
- Extract **all** instructions:
  - Top-level instructions from `transaction.message.instructions`.
  - Inner instructions (CPI) from `meta.innerInstructions`, keyed by parent index.
- Build an `InstructionNode` tree where each top-level instruction owns its inner instructions as children, nested in call order.
- Preserve original ordering and indices; support arbitrary CPI depth as reported by RPC (inner instructions carry an optional depth/stackHeight — nest accordingly, fall back to flat-under-parent if absent).

### FR-4 — Overview / summary
- Show: signature, status (success/failed + error), slot, block time (human + raw), fee (lamports + SOL), compute units consumed, tx version (`legacy`/`0`), signers (fee payer highlighted), instruction count (top-level + total incl. inner).

### FR-5 — Known program labeling
- Map program IDs to human labels + category for at least: System, SPL Token (+ Token-2022), Associated Token Account, Compute Budget, Memo, Stake, Vote, Address Lookup Table, BPF Loader(s).
- Unknown programs show truncated address with copy + explorer link; never crash on unknown.

### FR-6 — Instruction detail views
- **Parsed** tab: jsonParsed `program`/`type`/`info` rendered as readable key–value.
- **Raw** tab: program id, accounts (with signer/writable flags), raw data.
- Per-instruction account list distinguishes ALT-resolved (loaded) addresses from statically-included ones (from `meta.loadedAddresses`).

### FR-7 — Token balance changes
- Compute per-owner/per-mint deltas from `meta.preTokenBalances` / `postTokenBalances`; also native SOL deltas from `preBalances`/`postBalances`.
- Present as a compact deltas panel (increase/decrease styling, WCAG AA contrast — never color-only).

### FR-8 — Logs
- Show `meta.logMessages` in a collapsible panel; monospace, wrap/scroll; empty-state when null.

### FR-9 — States
- Designed loading skeletons, empty state (nothing searched yet), not-found state, and error state — all in liquid-glass styling.

## 4. Non-functional requirements

- **NFR-1 Design:** liquid-glass / atmospheric — animated background blobs, `backdrop-blur-2xl`, layered depth/shadows. Respect `prefers-reduced-motion` (freeze/disable animation). WCAG AA contrast on all text over glass.
- **NFR-2 Accessibility:** keyboard operable, focus-visible rings, ARIA on tabs/accordions (Radix provides), semantic timeline.
- **NFR-3 Performance:** server-side RPC only (no key leakage to client); render large instruction trees without jank (virtualize only if needed — not required initially).
- **NFR-4 Resilience:** every RPC/parse failure maps to a typed, user-facing state; no unhandled throws in the route or parser.
- **NFR-5 Security:** RPC endpoint + any secret stay server-side; custom RPC validated; no secrets in client bundle.
- **NFR-6 Correctness:** parser is pure/deterministic and unit-tested against a fixture containing inner instructions.

## 5. Acceptance criteria (high level)

- Valid signature → overview + nested instruction tree with visible CPI nesting.
- Invalid signature → inline validation error, no network call.
- Unknown/not-found signature → designed not-found state.
- Known programs render friendly labels; unknown render safely.
- Parsed/Raw tabs, token deltas, and collapsible logs all functional.
- Reduced-motion disables blob animation.
- `npm run build` succeeds; tests (FR-1, FR-3, FR-5, FR-2 URL validation) pass.

## 6. Test matrix (see implementation-plan Step 5)

| ID | Area | Assertion |
|---|---|---|
| T-1 | Signature validation | valid 87–88 char base58 passes; wrong charset/length fails |
| T-2 | Instruction tree | fixture w/ inner instructions → correct parent→child nesting, counts, order |
| T-3 | Program labels | known IDs map to expected label+category; unknown → safe fallback |
| T-4 | RPC URL validation | http/https well-formed pass; non-http, malformed, internal-host reject |
| T-5 | Deltas (recommended) | pre/post balances → correct signed token & SOL deltas |
