# transaction_decoder — Architecture (HLD + LLD)

Design artifact for the Solana transaction signature decoder. Companion to `requirements.md` and `implementation-plan.md`. No implementation code — shapes are described as field contracts.

## 1. High-level design (HLD)

### 1.1 System context
Single Next.js app. The browser never talks to an RPC directly. All RPC access is proxied through one server-side Route Handler that owns endpoint resolution and secrets.

```
Browser (Client Components)
  │  fetch /api/transaction?signature=&cluster=[&rpc=]
  ▼
Route Handler (server)  ──►  Endpoint resolver  ──►  Solana RPC (getTransaction)
  │  typed JSON response                                   │ raw jsonParsed tx
  ◄───────────────────────────────────────────────────────┘
  ▼
Pure decode pipeline (shared, runs server-side in the route):
  validate → normalize overview → build instruction tree → label programs → compute deltas
  ▼
Typed DecodeResult → Client renders (hero, overview, timeline, tabs, logs, deltas)
```

### 1.2 Layering
- **Domain (`src/lib/solana`)** — pure, framework-free. Validation, tree builder, program registry, delta computation, types. Deterministic and fully unit-testable. No React, no `next/*`.
- **Server edge (`src/app/api/transaction`)** — endpoint resolution, RPC call, maps raw tx → `DecodeResult`, error taxonomy. Thin; delegates all logic to domain.
- **Presentation (`src/components`, `src/app/page.tsx`)** — Client Components consuming `DecodeResult`; liquid-glass primitives.

### 1.3 Key decisions
- **Decode server-side.** The route returns an already-decoded `DecodeResult`, so the client bundle stays lean and RPC/secrets never leak. Domain layer is isolated enough to also be reused client-side later if desired.
- **Tree, not flat list.** Inner instructions are nested under their parent top-level instruction using `innerInstructions[].index`; depth uses `stackHeight` when present, else flat-under-parent.
- **Typed error taxonomy** over thrown errors, so the UI maps 1:1 to designed states.
- **Program registry as data table**, not `switch` — extensible, and directly unit-testable.

## 2. Folder structure

```
transaction_decoder/
├─ requirements.md
├─ architecture.md
├─ implementation-plan.md
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                # <html className="dark"> + font vars ON <html>
│  │  ├─ page.tsx                  # hero + results composition (client)
│  │  ├─ globals.css               # Tailwind v4 + @theme inline (Geist fix), glass tokens
│  │  └─ api/
│  │     └─ transaction/
│  │        └─ route.ts            # GET + POST handler
│  ├─ components/
│  │  ├─ ui/                       # shadcn primitives (new-york)
│  │  ├─ glass/                    # liquid-glass primitives (GlassPanel, BlobField)
│  │  ├─ search/                   # SignatureSearch, ClusterSelector, RpcInput
│  │  ├─ overview/                 # TransactionOverview + stat tiles
│  │  ├─ instructions/            # InstructionTree, InstructionNodeCard, Parsed/Raw tabs, AccountList
│  │  ├─ deltas/                   # TokenBalanceDeltas, SolDeltas
│  │  ├─ logs/                     # LogPanel (collapsible)
│  │  └─ states/                   # LoadingSkeleton, EmptyState, NotFoundState, ErrorState
│  ├─ lib/
│  │  ├─ solana/
│  │  │  ├─ types.ts               # domain models (see §3)
│  │  │  ├─ validation.ts          # signature + RPC URL validation
│  │  │  ├─ endpoints.ts           # cluster defaults + endpoint resolver
│  │  │  ├─ rpc.ts                 # thin getTransaction wrapper (mockable)
│  │  │  ├─ instruction-tree.ts    # raw tx → InstructionNode[]
│  │  │  ├─ program-registry.ts    # programId → label/category
│  │  │  ├─ overview.ts            # raw tx → TransactionOverview
│  │  │  └─ deltas.ts              # pre/post balances → deltas
│  │  ├─ format.ts                 # lamports→SOL, time, address truncation
│  │  └─ utils.ts                  # cn() etc. (from shadcn)
│  └─ test/
│     ├─ fixtures/
│     │  └─ tx-with-inner.json     # real-ish tx w/ inner instructions
│     ├─ validation.test.ts
│     ├─ instruction-tree.test.ts
│     ├─ program-registry.test.ts
│     └─ endpoints.test.ts
└─ (config: package.json, tsconfig, next config, vitest config, components.json)
```

## 3. Domain models

Described as field contracts (TypeScript-shaped, no implementation). All live in `src/lib/solana/types.ts`.

### 3.1 `Cluster`
Union: `"mainnet-beta" | "devnet" | "testnet"`.

### 3.2 `TransactionOverview`
| Field | Type | Notes |
|---|---|---|
| `signature` | string | echoed input |
| `status` | `"success" \| "failed"` | from `meta.err` |
| `error` | string \| null | stringified `meta.err` |
| `slot` | number | |
| `blockTime` | number \| null | unix seconds |
| `feeLamports` | number | `meta.fee` |
| `computeUnitsConsumed` | number \| null | `meta.computeUnitsConsumed` |
| `version` | `"legacy" \| 0` | tx version |
| `feePayer` | string | first signer |
| `signers` | string[] | writable-signer accounts |
| `topLevelCount` | number | |
| `totalInstructionCount` | number | incl. inner |

### 3.3 `ProgramInfo`
| Field | Type | Notes |
|---|---|---|
| `programId` | string | base58 |
| `label` | string | e.g. "SPL Token" or truncated id |
| `category` | enum | `system \| token \| ata \| compute-budget \| memo \| stake \| vote \| alt \| loader \| unknown` |
| `known` | boolean | registry hit |

### 3.4 `AccountRef`
| Field | Type | Notes |
|---|---|---|
| `pubkey` | string | |
| `isSigner` | boolean | |
| `isWritable` | boolean | |
| `source` | `"static" \| "lookup-table"` | ALT-resolved vs static |

### 3.5 `InstructionNode` (recursive)
| Field | Type | Notes |
|---|---|---|
| `id` | string | stable path key, e.g. `"2.0.1"` |
| `depth` | number | 0 = top-level |
| `index` | number | order within parent |
| `program` | `ProgramInfo` | |
| `parsed` | object \| null | jsonParsed `{ type, info }` when available |
| `raw` | `{ accounts: AccountRef[]; data: string }` | always present |
| `children` | `InstructionNode[]` | inner/CPI instructions |

### 3.6 `TokenBalanceDelta`
| Field | Type | Notes |
|---|---|---|
| `owner` | string \| null | |
| `mint` | string | |
| `preAmount` / `postAmount` | string | UI-amount strings (decimals-aware) |
| `deltaUi` | string | signed |
| `decimals` | number | |

### 3.7 `SolBalanceDelta`
| Field | Type | Notes |
|---|---|---|
| `account` | string | |
| `preLamports` / `postLamports` | number | |
| `deltaLamports` | number | signed |

### 3.8 `DecodeResult` (route success payload)
| Field | Type |
|---|---|
| `overview` | `TransactionOverview` |
| `instructions` | `InstructionNode[]` |
| `tokenDeltas` | `TokenBalanceDelta[]` |
| `solDeltas` | `SolBalanceDelta[]` |
| `logs` | `string[]` |

### 3.9 `DecodeError` (route error payload)
| Field | Type | Notes |
|---|---|---|
| `code` | enum | `invalid_signature \| not_found \| invalid_rpc_url \| rpc_error \| timeout \| internal` |
| `message` | string | user-facing |

## 4. API contract

Route: `src/app/api/transaction/route.ts` — supports **GET** (query params) and **POST** (JSON body). POST is preferred for long/custom RPC URLs; GET enables shareable/deep-link fetches.

### 4.1 Request
- **GET** `/api/transaction?signature={sig}&cluster={cluster}&rpc={customRpcUrl?}`
- **POST** `/api/transaction` body: `{ signature, cluster, rpc? }`

| Param | Required | Rules |
|---|---|---|
| `signature` | yes | base58, decodes to 64 bytes (~87–88 chars) |
| `cluster` | yes | one of `mainnet-beta \| devnet \| testnet` |
| `rpc` | no | valid http/https URL; overrides cluster default; internal hosts rejected |

### 4.2 Responses
| Situation | HTTP | Body |
|---|---|---|
| Decoded OK | 200 | `DecodeResult` |
| Signature fails validation | 400 | `DecodeError{code:"invalid_signature"}` |
| `rpc` fails validation | 400 | `DecodeError{code:"invalid_rpc_url"}` |
| RPC returns null (unknown sig) | 404 | `DecodeError{code:"not_found"}` |
| Upstream RPC failure | 502 | `DecodeError{code:"rpc_error"}` |
| Upstream timeout | 504 | `DecodeError{code:"timeout"}` |
| Unexpected | 500 | `DecodeError{code:"internal"}` |

- `Content-Type: application/json`; no caching of successful decodes by default (or short `s-maxage` — optional, not required).
- Endpoint resolution precedence: validated `rpc` → `SOLANA_RPC_URL` (env, applies to its cluster) → public default for `cluster`.

## 5. Component hierarchy

```
app/layout.tsx  (dark html, font vars, globals.css)
└─ app/page.tsx  (client; holds query state + fetch)
   ├─ glass/BlobField            (animated blobs; reduced-motion aware; z-behind)
   ├─ search/SignatureSearch     (hero, glass input, validate)
   │  ├─ search/ClusterSelector  (shadcn Select)
   │  └─ search/RpcInput         (optional custom RPC; validated)
   ├─ states/LoadingSkeleton | EmptyState | NotFoundState | ErrorState
   └─ Results (when DecodeResult present)
      ├─ overview/TransactionOverview
      │  └─ StatTile × n         (status, slot, time, fee, CU, version, signers, counts)
      ├─ instructions/InstructionTree
      │  └─ InstructionNodeCard (recursive; glass pane, nesting indent/connector)
      │     ├─ instructions/ParsedRawTabs  (shadcn Tabs)
      │     │  ├─ ParsedView
      │     │  └─ RawView → AccountList (signer/writable/ALT badges)
      │     └─ children: InstructionNodeCard[]  (nested CPI)
      ├─ deltas/TokenBalanceDeltas + deltas/SolDeltas
      └─ logs/LogPanel  (shadcn Collapsible)
```

State: `page.tsx` owns `{ status: idle|loading|success|not_found|error, result, errorCode, cluster, rpc }`. Single source of truth; children are presentational and receive typed props.

## 6. File & code naming conventions

- **Components:** PascalCase files (`InstructionTree.tsx`), one primary export per file. Folders group by feature domain (kebab or lowercase).
- **Domain modules:** kebab-case (`instruction-tree.ts`, `program-registry.ts`). Pure functions, named exports, verbNoun (`buildInstructionTree`, `resolveEndpoint`, `validateSignature`, `computeTokenDeltas`).
- **Types:** PascalCase in `types.ts`; enums/unions as string-literal unions.
- **Tests:** `*.test.ts` mirroring the module name, in `src/test`.
- **CSS tokens:** liquid-glass design tokens as CSS custom properties in `globals.css` (`--glass-bg`, `--glass-border`, `--glass-blur`), consumed via Tailwind v4 `@theme`. Accent via `--color-primary` (cyan/violet).
- **No inline imports**; imports at top. Exhaustive `switch` with `never` default for any union handling (e.g., category → styling, error code → state).

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Geist font circular ref in `@theme inline` | Define raw `--font-*` vars outside `@theme inline`, reference them in `@theme inline`; set font vars on `<html>` |
| CPI depth beyond parent (rare deep nesting) | Use `stackHeight` when present; else nest flat under parent index (documented fallback) |
| Versioned tx ALT accounts | Read `meta.loadedAddresses`; tag `AccountRef.source` accordingly |
| Public RPC rate limits / CORS | Server-side only; allow `SOLANA_RPC_URL` + custom RPC; timeout → typed `timeout` |
| Custom RPC SSRF | Validate http(s) + reject internal/loopback hosts (best-effort) server-side |
| Large trees jank | Acceptable initially; virtualization deferred (noted, not required) |
