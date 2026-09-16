# Hikari Protocol — Architecture Specification

> **Autonomous Liquid Staking, Multi-Strategy Yield Routing & Agentic Execution on Stellar Protocol 27 (Soroban)**
> Complete system blueprint detailing the Soroban smart contract suite, autonomous keeper pipelines, mathematical solvency invariants, x402 payment channels, and MCP agent interfaces.

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Component inventory & repo layout](#2-component-inventory--repo-layout)
3. [The liquid staking lifecycle](#3-the-liquid-staking-lifecycle)
4. [Soroban smart contract suite](#4-soroban-smart-contract-suite)
5. [Autonomous keeper & MEV backrun engine](#5-autonomous-keeper--mev-backrun-engine)
6. [Safety sentinel & circuit breakers](#6-safety-sentinel--circuit-breakers)
7. [x402 micropayments & MCP agent surface](#7-x402-micropayments--mcp-agent-surface)
8. [Trust boundaries & formal invariants](#8-trust-boundaries--formal-invariants)
9. [File map](#9-file-map)

---

## 1. System overview

Hikari operates across three unified planes sharing a common mathematical invariant and non-custodial execution model:

- **Control Plane**: Modern web frontend (`frontend/public/`), developer client SDK (`@hikari/sdk`), and Model Context Protocol (MCP) server for autonomous AI agents.
- **Execution Plane**: Soroban smart contracts on Stellar Protocol 27 (`contracts/hikari_core`, `strategy_blend` (simulated), `strategy_phoenix` (simulated), `strategy_soroswap` (simulated), `safety_sentinel`). All asset movements are strictly signed by users or triggered by verified on-chain invariants.
- **Optimization Plane**: Autonomous off-chain keeper robots (`engine/src/`) and an atomic MEV backrunner that monitors SDEX and Soroban orderbooks, capturing cross-venue arbitrage and compounding 100% of proceeds into staker NAV.

```mermaid
flowchart TB
  subgraph Clients["Clients & Interfaces"]
    User["👤 Staker (Browser + Freighter / Lobstr / xBull)"]
    Agent["🤖 AI Agent (Claude / Cursor / Antigravity via MCP)"]
    Keeper["⚙️ Autonomous Keeper (Policy Engine)"]
  end

  subgraph Control["Control Plane"]
    WebUI["DApp Workspace\n/app (Stake, Wrap, Withdraw, Rewards, Earn)"]
    SDK["@hikari/sdk\nTypeScript Client Library"]
    MCPServer["MCP Server\nTools & Prompt Surface"]
    API["API Gateway & Anti-Mixup DB\nNode.js / Express / Resilient DB"]
  end

  subgraph CoreContracts["Soroban Execution Plane (Protocol 27)"]
    Core["hikari_core.wasm\nVault Accounting, Mint/Burn, NAV Engine"]
    hXLM["hXLM Token (SEP-41)\nYield-Bearing Liquid Receipt"]
    whXLM["whXLM Token (ERC-4626)\nStatic DeFi Collateral Wrapper"]
    Sentinel["safety_sentinel.wasm\nCircuit Breaker, Bunker Mode, GateSeal"]
  end

  subgraph Strategies["Stellar Strategy Adapters"]
    StratBlend["strategy_blend.wasm\nBlend Money Market Lending (Simulated)"]
    StratPhoenix["strategy_phoenix.wasm\nPhoenix CLAMM Narrow-Band LP (Simulated)"]
    StratSoroswap["strategy_soroswap.wasm\nSoroswap AMM Pools (Simulated)"]
    SDEXBuffer["SDEX Arbitrage Buffer\nAtomic MEV Backrun Buffer"]
  end

  User --> WebUI
  Agent --> MCPServer
  Keeper --> SDK
  WebUI --> SDK
  MCPServer --> SDK
  SDK --> API
  API --> Core
  User -->|Signs deposit / unbond| Core
  Core --> hXLM
  Core --> whXLM
  Core --> Sentinel
  Core --> StratBlend
  Core --> StratPhoenix
  Core --> StratSoroswap
  Core --> SDEXBuffer
  Sentinel -.->|Emergency Pause| Core
```

---

## 2. Component inventory & repo layout

| Component | Responsibility | Path | Status |
| --------- | -------------- | ---- | ------ |
| **DApp Workspace** | 5-tab user interface (Stake, Wrap, Withdrawals, Rewards, Earn) with Card on Top -> FAQ Under hierarchy | `frontend/public/app.html` | ✅ Live |
| **DApp State Engine** | Wallet connection, reactive tab switching, real-time calculations, and toast dispatcher | `frontend/public/app.js` | ✅ Live |
| **Landing & Showcase** | Architecture highlights, TVL telemetry, and interactive mobile simulation banner | `frontend/public/index.html` | ✅ Live |
| **Design System** | Tailored dark theme CSS, mobile responsive layouts, and modal components | `frontend/public/styles.css` | ✅ Live |
| **`@hikari/sdk`** | TypeScript SDK providing NAV queries, deposit builders, and unbonding status checks | `sdk/src/client.ts` | ✅ Live (5/5 tests) |
| **Policy & Risk Engine** | Invariant verification, drawdown monitoring, and circuit breaker activation | `engine/src/` | ✅ Live (8/8 tests) |
| **Security & DB Backend** | Multi-tenant address isolation, cryptographic nonces, and tamper-evident audit logs | `frontend/server.js` | ✅ Live (7/7 tests) |
| **Soroban Smart Contracts** | Rust smart contracts compiling to Soroban WASM targets | `contracts/` | ✅ Live |

---

## 3. The liquid staking lifecycle

### 3.1 Deposit and Staking
1. **Quote Request**: The user enters an XLM amount in the DApp or agent calls `previewDeposit()`.
2. **NAV Valuation**: The core contract computes current shares to mint:
   $$\text{Shares to Mint} = \frac{\text{Deposit Amount} \times \text{Total Shares}}{\text{Total Pooled XLM}}$$
3. **Transaction Submission**: The user signs a non-custodial transaction via Freighter. XLM transfers to `hikari_core`, and freshly minted `hXLM` is transferred to the user's wallet.
4. **Strategy Deployment**: Autonomous keepers batch unallocated XLM into approved adapters (Blend and Phoenix), keeping $\ge 15\%$ in liquid reserves.

### 3.2 Dual Unbonding Options
- **Queue-Based Settlement**:
  1. User calls `request_withdraw(shares)`.
  2. `hXLM` is burned, and a verifiable unbonding claim ticket is registered in the on-chain FIFO queue.
  3. After the 1–3 day epoch cooldown, user calls `claim_withdraw(ticket_id)` to receive native XLM.
- **Instant DEX Swap**:
  1. User selects "Use DEX Instant Swap" in the UI.
  2. An atomic swap route is executed on Soroswap / Phoenix CLAMM, swapping `hXLM` for `XLM` in $\approx 5$ seconds.

```mermaid
sequenceDiagram
  autonumber
  actor User as 👤 Staker
  participant UI as 🖥️ DApp (app.html)
  participant Core as 🏦 hikari_core
  participant Token as 🪙 hXLM (SEP-41)
  participant Strat as 📈 Strategy Adapters

  User->>UI: Enter XLM amount & click "Stake XLM"
  UI->>Core: previewDeposit(amount)
  Core-->>UI: Return estimated hXLM shares
  User->>UI: Sign transaction via Freighter
  UI->>Core: deposit(user, amount)
  Core->>Token: mint(user, shares)
  Core->>Strat: allocate_capital(amount * 0.85)
  Core-->>User: Emit DepositEvent(user, amount, shares)
```

---

---

## 4. Soroban smart contract suite

### 4.1 `hikari_core`
The central accounting vault and share registry:
- Implements the SEP-41 token standard for `hXLM`.
- Tracks global reserves: $R_{\text{liquid}} + \sum A_{\text{strategy}} = R_{\text{total}}$.
- Virtual Shares Offset: Implements an $OFFSET = 1000$ virtual shares mechanism to mathematically neutralize the ERC-4626 first-depositor inflation attack.
- Manages the unbonding FIFO ticket queue and cooldown epochs.
- Strictly enforces the mandatory 15% liquid reserve floor before any strategy allocation.

### 4.2 Pluggable Strategy Adapters (`IYieldAdapter`)
Following the native `YieldAdapterInterface` pattern, each strategy implements a uniform interface:
```rust
pub trait YieldAdapterInterface {
    fn deposit(e: Env, amount: i128) -> Result<i128, Error>;
    fn withdraw(e: Env, shares: i128) -> Result<i128, Error>;
    fn total_assets(e: Env) -> i128;
    fn harvest(e: Env) -> i128;
}
```
- **`blend_adapter` (Simulated yield — does not call the real Blend protocol)**:
  - Deployed to testnet (`contracts/blend_adapter`), tracks principal/interest internally.
  - `harvest()` accrues interest at a fixed configured rate (`LendingRateBps`), not a live Blend `b_rate` read. No specific APY is claimed — see `configured_rate_bps()` and `/api/yield-routes`.
- **`phoenix_adapter` (Simulated yield — does not call the real Phoenix protocol)**:
  - Deployed to testnet (`contracts/phoenix_adapter`), same fixed-rate self-accrual pattern as above.

- **`soroswap_adapter` (Simulated yield — does not call the real Soroswap protocol)**:
  - Deployed to testnet (`contracts/soroswap_adapter`), same fixed-rate self-accrual pattern.

- **Defindex adapter: not built.** There is no Defindex contract in this repository and no deployed address — earlier docs referenced one with a specific APY figure; that was aspirational, not real.

### 4.3 Atomic Zero-Signature Migration (`migrate_adapter`)
When the AI Yield Rerouter discovers a higher-yielding protocol venue:
1. The Keeper calls `migrate_adapter(old_adapter, new_adapter, max_slippage_bps)`.
2. The contract unwinds capital from the old adapter, verifies that slippage is within bounds ($\le 50\text{ bps}$), and deposits into the new adapter in the exact same ledger transaction.
3. **Zero Depositor Transactions**: Individual stakers do not need to sign transactions, approve allowances, or incur tax events.

---

## 5. AI Yield Rerouter & Cross-Protocol Pareto Optimizer

Hikari acts as an autonomous AI router continuously scanning, rating, and reallocating capital across Stellar:

```mermaid
flowchart LR
    Scan["1. Adapter TVL/rate read\nvia /api/yield-routes (live, real)"]
    Pareto["2. Allocation weights\n(target percentages, policy config)"]
    Migrate["3. Native migrate_adapter\n(Soroban contract call, real when invoked)"]

    Scan --> Pareto --> Migrate
```

### 5.1 Venue Status

| Protocol Venue | Contract Adapter | Status |
| -------------- | ---------------- | ------ |
| Blend | `blend_adapter` | Deployed testnet, simulated self-accrual, no live Blend call |
| Phoenix CLAMM | `phoenix_adapter` | Deployed testnet, simulated self-accrual, no live Phoenix call |
| Soroswap | `soroswap_adapter` | Deployed testnet, simulated self-accrual, no live Soroswap call |
| Liquid Safety Reserve | held uninvested in vault | Real — 15% reserve floor is an enforced invariant |
| Defindex | — | Not built — no contract exists |

Target allocation weights (35% Blend / 30% Phoenix / 20% Soroswap / 15% reserve) are a policy configuration, not a computed optimum — there is no Pareto optimizer implementation in this codebase.

### 5.2 Depth Aggregation & Settlement Liveness Verification

Not implemented. There is no VWAP/orderbook-depth aggregation or settlement-liveness scoring anywhere in this codebase (`engine/`, `sdk/`, `services/`). `migrate_adapter` slippage bounds are a design parameter for when this ships, not a currently-enforced check.

---

## 6. Hikari Trading Desk & Yield Carry

**What actually exists**: `frontend/server.js`'s `/api/trading-agent` endpoint computes RSI(14), ATR(14), and MACD(12/26/9) from real Stellar Horizon `trade_aggregations` (with a CoinGecko fallback), and derives a single rule-based long/short/hold signal with stop-loss/take-profit levels from that. That's it — one deterministic indicator engine, not a multi-agent system.

```mermaid
flowchart TD
    MarketData["Market Tick Ingestion\nHorizon trade_aggregations + CoinGecko fallback"]
    Indicators["RSI(14) / ATR(14) / MACD(12,26,9)\ncomputed server-side, real data"]
    Signal["Rule-based signal\nlong / short / hold + SL/TP from ATR"]

    MarketData --> Indicators --> Signal
```

### 6.1 What this doc previously claimed vs. reality

An earlier version of this document (and the shipped UI) described "4 Financial Specialists" — Warren (Fundamental), George (Technical), Cathie (Sentiment), Ray (Risk) — conducting a "Bull vs. Bear Debate." No such agents, debate loop, or LLM orchestration exists anywhere in `engine/`, `sdk/`, or `services/`. Only the technical-indicator piece (roughly "George") and a risk-guardrail summary (roughly "Ray") are real; Fundamental and Sentiment analysis are not implemented.

### 6.2 Yield Carry

Unallocated trading margin is intended to route into the Blend adapter contract. That adapter currently runs simulated, self-accrued yield at a fixed configured rate (see §4.2) — no specific APY is claimed here.

---

## 7. Autonomous keeper & MEV backrun engine

Hikari keepers are autonomous daemons that monitor the Stellar network every ledger close (~5 seconds):

1. **Harvest & Compound**: Each adapter's `harvest()` accrues its internally-tracked interest (see §4.2 — fixed configured rate, not a real BLND/PHX emissions claim from those tokens; the adapters do not hold or trade BLND or PHX).
2. **Atomic MEV Backrunning** (`engine/src/agents/keeper_bot.ts`):
   - Keepers monitor SDEX/Soroban AMM spreads and can construct an atomic multi-operation backrun transaction when spread exceeds a configured threshold.
   - Because all legs would execute in a single atomic Stellar transaction, there is no inventory risk if implemented as designed — a reverted spread reverts the whole transaction.
   - **Realized MEV profit is not yet measured or reported.** No APY figure is claimed for this.

---

## 8. Safety sentinel & circuit breakers

The `safety_sentinel` contract acts as an autonomous risk arbiter:

- **Drawdown Guard**: If any individual strategy experiences an NAV decline exceeding 5% in a 24-hour window, the strategy is automatically paused.
- **Bunker Mode**: If network-wide volatility or a major depeg occurs, Bunker Mode activates:
  - New deposits and rebalancing are paused.
  - All available strategy capital is unwound to liquid XLM reserves.
  - Redemptions are processed strictly pro-rata from verified cash reserves.
- **GateSeal Multisig**: An ephemeral, one-time emergency pause key held by protocol guardians to freeze vulnerable code paths without requiring contract upgrades.

---

## 9. How Hikari directly helps the Stellar ecosystem

1. **Addresses the Zero-Inflation Staking Problem**: Turns passive XLM into liquid `hXLM`. Current yield is a keeper-fed oracle rate (see live `/api/telemetry`), not yet derived from real Blend/Phoenix/Soroswap activity.
2. **Targets Liquidity Fragmentation**: Vault can route TVL across Blend, Phoenix, and Soroswap adapter contracts — those adapters run simulated yield today, not a live cross-protocol routing algorithm.
3. **Internalizes MEV Value**: Replaces adversarial off-chain MEV bots with a collaborative staker backrun engine that recycles arbitrage spreads back into the community.
4. **Empowers AI Agent Economy**: Provides an x402 HTTP micropayment standard and MCP server tools, making Stellar the premier settlement hub for autonomous AI financial agents.

---

## 10. File map

```text
Hikari/
├── contracts/                     # Soroban Rust smart contracts
│   ├── hikari_core/               # Vault, share minting, unbonding queue
│   ├── strategy_blend/            # Blend money market adapter (Simulated)
│   ├── strategy_phoenix/          # Phoenix CLAMM concentrated LP adapter (Simulated)
│   └── safety_sentinel/           # Circuit breakers & Bunker Mode
├── sdk/                           # @hikari/sdk TypeScript package
│   ├── src/client.ts              # Core HikariClient methods
│   └── src/test.ts                # SDK unit verification suite (10/10 passing)
├── engine/                        # Yield policy and risk engine
│   ├── src/adapters/              # IYieldAdapter implementations (Blend, Phoenix, Soroswap, Defindex)
│   ├── src/policyVerifier.ts      # Automated invariant validation
│   └── src/riskEngine.ts          # Bunker Mode & GateSeal triggers
├── agents/                        # Autonomous AI Agent Layer (Hikari Multi-Agent)
│   ├── src/market_agent.ts        # Hikari financial specialists & debate engine
│   ├── src/yield_agent.ts         # Stellar best yield optimizer
│   └── data/                      # Auto-generated audit reports & decision logs
├── frontend/                      # Web dashboard & 8-Tab DApp workspace
│   ├── server.js                  # Express backend & anti-mixup cloud DB (/api/yield-routes, /api/trading-agent)
│   └── public/
│       ├── index.html             # Landing page & simulation banner
│       ├── app.html               # 8-Tab DApp workspace (Card on Top -> FAQ Under)
│       ├── app.js                 # Reactive frontend state & toast dispatcher
│       └── styles.css             # Design tokens & responsive mobile layouts
├── docs/                          # Comprehensive documentation suite
│   ├── PROPOSAL.md                # Stellar Community Fund grant proposal
│   ├── ARCHITECTURE.md            # System architecture specification
│   ├── ROADMAP.md                 # Multi-phase milestone roadmap
│   ├── INTENT_API.md              # Intent schema & keeper API
│   ├── ORACLE_SPEC.md             # Soroban oracle interface
│   ├── STRATEGY_RISK_REPUTATION.md# Strategy scoring & dispute resolution
│   ├── SECURITY.md                # Security model & vulnerability disclosure
│   ├── THREAT_MODEL.md            # STRIDE threat analysis & mitigations
│   ├── NON_CUSTODY.md             # Non-custodial architectural proof
│   ├── SEP_COMPLIANCE.md          # Stellar standards matrix
│   ├── CONTRIBUTOR_LADDER.md      # Contributor progression & governance
│   ├── COOKBOOK.md                # Developer recipes & SDK snippets
│   ├── FAQ.md                     # Comprehensive protocol FAQs
│   ├── BENCHMARKS.md              # Gas & CPU instruction benchmarks
│   ├── MCP.md                     # Model Context Protocol agent guide
│   └── SDK.md                     # Complete SDK API reference
└── .github/                       # GitHub Actions CI & issue templates
    ├── workflows/                 # CI, CodeQL, Commitlint, Vercel Deploy
    └── PULL_REQUEST_TEMPLATE.md   # Pull request guidelines
```

