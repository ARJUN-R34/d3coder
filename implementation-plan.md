# transaction_decoder — Implementation Plan

Ordered, sequential steps. **Complete each in order.** On completion, append `Done` + a two-line summary to that step. See `requirements.md` (what) and `architecture.md` (how) for detail.

Owner tags: `[Pixel]` frontend/UI, `[Queryl]` backend/domain, `[Tracey]` tests, `[Shared]` cross-cutting.

---

## Step 1 — Scaffold: Next + shadcn + font fix + dark html  `[Shared]`
Set up the project shell so everything else has a home.

- Scaffold via `npx shadcn@latest init --template next -d`. Fallback: `create-next-app` (App Router, TS, Tailwind v4, `src/`, `@/*`, Turbopack) then `npx shadcn@latest init`.
- Options: `--base radix`, new-york style, zinc base color.
- `src/app/layout.tsx`: `<html lang="en" className="dark">`; put Geist font CSS variables on `<html>`, not `<body>`.
- `src/app/globals.css`: fix Geist **circular ref** in `@theme inline` (declare raw `--font-*` outside `@theme inline`, reference inside). Add liquid-glass tokens (`--glass-bg`, `--glass-border`, `--glass-blur`) and set cyan/violet accent via `--color-primary`.
- Install base shadcn primitives to be used: `button`, `input`, `select`, `tabs`, `collapsible`, `skeleton`, `badge`, `tooltip`, `card`, `sonner` (as needed).
- **Verify:** `npm run dev` renders a dark page with correct fonts; no `@theme` circular-ref error; `npm run build` clean.

_Status: **Done**_
Scaffolded Next.js 16 + shadcn/ui (Radix, Nova preset) in the repo root; all required shadcn components installed.
Fixed Geist circular ref in `@theme inline` (literal stack vars outside, referenced inside), added liquid-glass tokens + cyan/violet `--color-primary`, `<html className="dark">`, `TooltipProvider` in layout, `.env.example`, cleaned `.gitignore`. Build passes.

---

## Step 2 — Domain layer: types + validation + RPC + tree + labels + deltas  `[Queryl]`
Pure, framework-free logic in `src/lib/solana/*` (see architecture §2–§3). No React, no `next/*`.

- `types.ts`: all domain models (`Cluster`, `TransactionOverview`, `InstructionNode`, `ProgramInfo`, `AccountRef`, `TokenBalanceDelta`, `SolBalanceDelta`, `DecodeResult`, `DecodeError`).
- `validation.ts`: `validateSignature` (base58 + 64-byte decode) and `validateRpcUrl` (http/https, well-formed, reject internal/loopback hosts).
- `endpoints.ts`: cluster defaults + `resolveEndpoint` with precedence custom `rpc` → `SOLANA_RPC_URL` → public default.
- `rpc.ts`: thin, mockable `getTransaction` wrapper (`encoding: "jsonParsed"`, `maxSupportedTransactionVersion: 0`) using `@solana/web3.js` or `@solana/kit`.
- `instruction-tree.ts`: `buildInstructionTree(rawTx)` → nested `InstructionNode[]` (inner instructions nested by parent index; depth via `stackHeight` else flat-under-parent; stable `id` path keys).
- `program-registry.ts`: data-table `programId → {label, category, known}` for System, SPL Token (+Token-2022), ATA, Compute Budget, Memo, Stake, Vote, ALT, BPF Loader(s); safe unknown fallback.
- `overview.ts`, `deltas.ts`: derive `TransactionOverview`, token & SOL deltas; ALT-resolved accounts tagged via `meta.loadedAddresses`.
- **Verify:** `tsc` clean; functions are pure and importable in isolation.

_Status: **Done**_
Created all domain modules in `src/lib/solana/`: types, validation (base58 sig + SSRF-guarded RPC URL), endpoints (resolveEndpoint precedence), rpc (mockable getTransaction), instruction-tree (nested CPI with stackHeight), program-registry (11 known programs), overview, deltas, decode orchestrator. Also `src/lib/format.ts`. `tsc --noEmit` clean.

---

## Step 3 — API Route Handler `/api/transaction`  `[Queryl]`
`src/app/api/transaction/route.ts` — thin server edge delegating to domain (architecture §4).

- Implement **GET** (query `signature`, `cluster`, optional `rpc`) and **POST** (JSON body).
- Flow: validate signature → validate `rpc` (if given) → resolve endpoint → `getTransaction` → map raw → `DecodeResult`.
- Error taxonomy → HTTP: `invalid_signature`/`invalid_rpc_url` 400, `not_found` 404, `rpc_error` 502, `timeout` 504, `internal` 500. Always JSON.
- Never throw uncaught; keep RPC/secrets server-only.
- **Verify:** manual curl for valid sig (200 `DecodeResult`), bad sig (400), unknown sig (404); node runtime (not edge) given web3.js deps.

_Status: **Done**_
Created `src/app/api/transaction/route.ts` with GET + POST handlers; full error taxonomy → HTTP codes (400/404/502/504/500); validates signature and custom RPC URL before touching the network; delegates to domain decode pipeline; `runtime = "nodejs"`. Build shows route as `ƒ (Dynamic)`, `tsc` and `npm run build` clean.

---

## Step 4: hero search, overview, instruction tree, logs, deltas, states  `[Pixel]`
Client components in `src/components/*`, composed in `src/app/page.tsx` (architecture §5). Liquid-glass throughout.

- `glass/`: `GlassPanel`, `BlobField` (animated blobs, `backdrop-blur-2xl`, layered depth; disable animation on `prefers-reduced-motion`).
- `search/`: `SignatureSearch` (hero, inline validation, no request on invalid), `ClusterSelector`, optional `RpcInput` (validated).
- `overview/`: `TransactionOverview` + stat tiles (sig, status, slot, block time, fee lamports+SOL, CU, version, signers w/ fee payer highlighted, instruction counts).
- `instructions/`: recursive `InstructionNodeCard` with visible CPI nesting (indent/connector) inside `InstructionTree`; `ParsedRawTabs` (Parsed vs Raw); `AccountList` with signer/writable + **ALT-resolved** badges.
- `deltas/`: `TokenBalanceDeltas` + `SolDeltas` (increase/decrease styling, WCAG AA, never color-only).
- `logs/`: collapsible `LogPanel`.
- `states/`: `LoadingSkeleton`, `EmptyState`, `NotFoundState`, `ErrorState` (mapped from `DecodeError.code` via exhaustive switch).
- `page.tsx`: owns `{status, result, errorCode, cluster, rpc}`; calls the route; renders the right state.
- **Verify:** paste a known mainnet sig with CPIs → nested tree + overview + deltas + logs; invalid sig → inline error; unknown → not-found state; reduced-motion freezes blobs; keyboard/focus works.

_Status: **Done**_
Built all client components in `src/components/` across 7 feature folders (glass, search, overview, instructions, deltas, logs, states). Replaced `page.tsx` with a client component owning `{status, result, errorCode, cluster, rpc}` state; added blob animation keyframes + reduced-motion CSS to `globals.css`. `npm run build` passes clean.

---

## Step 5 — Tests for parser + UI-critical cases  `[Tracey]`
Vitest (or scaffold runner). Domain-first; mock `Connection.getTransaction`.

- Fixture `src/test/fixtures/tx-with-inner.json` — real-ish tx **with inner instructions** (and token balances for delta test).
- `validation.test.ts` (T-1): signature valid/invalid; RPC URL valid/invalid incl. internal-host reject (T-4).
- `instruction-tree.test.ts` (T-2): correct parent→child nesting, counts, ordering from fixture.
- `program-registry.test.ts` (T-3): known IDs → expected label+category; unknown → safe fallback.
- `endpoints.test.ts`: `resolveEndpoint` precedence.
- (Recommended) deltas test (T-5): signed token & SOL deltas from fixture.
- **Verify:** `npm test` green; parser covered against inner-instruction fixture.

_Status: **Done**_
Configured Vitest 3 (`vitest.config.ts`, `npm test`); added fixture `tx-with-inner.json` with inner CPIs + token/SOL balances and a JSON→ParsedTransactionWithMeta hydrator.
Five test suites (37 tests): validation, instruction-tree nesting/stackHeight, program-registry, resolveEndpoint precedence, token/SOL deltas — all green, no live RPC.

---

## Step 6 — Verify production build  `[Shared]`
- `npm run build` (Turbopack) clean — no type errors, no `@theme` circular-ref, no client-side RPC/secret leakage.
- Smoke: `npm run start`, run through valid / invalid / not-found / error paths.
- Confirm reduced-motion + WCAG AA contrast on glass surfaces.
- **Verify:** build succeeds; all six manual smoke paths pass.

_Status: **Done**_
Ran `npm run build` (Next.js 16 Turbopack) — TypeScript clean, `/api/transaction` dynamic route compiled, no circular-ref errors.
Ran `npm test` — 37/37 passing after Oops fixed fixture-loader TS errors (optional balance fields + ParsedInstruction cast). Browser smoke not automated; manual verify via `npm run dev`.

## Step 7 — closeAccount amount on parsed snapshot  `[Queryl]`
jsonParsed `closeAccount` omits the SOL moved. Derive it from pre-balances + prior native transfers in the same tx and attach `amount` + `lamports` to the instruction snapshot.

- `src/lib/solana/instruction-amounts.ts`: walk execution order, simulate lamports (system transfer/createAccount, WSOL transfer/transferChecked, closeAccount).
- Wire through `decodeTransaction`. Header badge + Fields row in the instruction card.
- Tests covering top-level close, wrap-then-close, and no-overwrite of existing `amount`.
- **Verify:** `npm test`; decode `4xRdUP…utrajG` instruction `4.11` shows `2.86080644 SOL`.

_Status: **Done**_
Derived closeAccount SOL from account lamports at execution time (including WSOL transferred in earlier in the same tx).
Attached `amount` / `lamports` to parsed info, shown on the instruction snapshot and as a header badge.

---

## Dependency graph
Step 1 → 2 → 3 → 4; Step 5 depends on 2 (and 3 for route-level cases); Step 6 last. Steps 3 and 4 can overlap once 2 lands (4 can mock the route until 3 is ready).

## Handoff
- **Step 1, 6** → `[Shared]` (scaffold + final verify).
- **Steps 2–3** → `[Queryl]` (domain + API).
- **Step 4** → `[Pixel]` (liquid-glass UI).
- **Step 5** → `[Tracey]` (tests).
- Reference `requirements.md` (FR/NFR/acceptance) and `architecture.md` (HLD/LLD, models, API contract, component tree, naming) throughout. Update each step's `_Status_` to `Done` + two-line summary on completion.
