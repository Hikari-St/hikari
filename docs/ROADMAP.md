# Hikari Protocol — Roadmap

> Five milestone versions, tickable. The wave structure represents the production roadmap
> for Hikari Protocol — what ships next, why it matters, and the verification gate for each release.

**Legend**: `[x]` Shipped on `main` · `[-]` In flight / testnet live · `[ ]` Planned.

---

## At a glance

| Version | Theme | Scope | Verification Gate | Status |
| ------- | ----- | ----- | ----------------- | ------ |
| **v1 Executable** | Liquid Staking & Multi-Strategy DApp | `#001–#050` · 4 waves | `node scripts/verify_ui.js` (38/38) + SDK tests green | 🟢 Shipped on Testnet |
| **v2 Observable** | Autonomous Keepers & Soroban Oracle | `#051–#100` · 4 waves | Oracle deployed on mainnet, keeper rebalancing verified | 🟡 In Progress |
| **v3 Guaranteed** | Invariant Proofs & Collateral Listing | `#101–#150` · 4 waves | Blend Money Market collateral integration | ⚪ Planned |
| **v4 Universal** | Agentic AI & x402 Micropayments GA | `#151–#200` · 4 waves | `@hikari/sdk` & `@hikari/mcp` on npm | ⚪ Planned |
| **v5 Institutional** | ZK-Solvency & Institutional Vaults | `#201–#250` · 4 waves | Third-party formal verification & audit | ⚪ Planned |

---

## v1 Executable — Liquid Staking Core & 5-Tab DApp Workspace

**Thesis**: Build a non-custodial liquid staking token (`hXLM`) on Stellar Protocol 27 (Soroban) with transparent unbonding queues and active strategy routing.

### Wave 1.0 Core Contracts & DApp (✅ Shipped)
- [x] `#001` Core vault contract (`hikari_core.wasm`) with share minting and unbonding queue.
- [x] `#002` SEP-41 compliant `hXLM` receipt token.
- [x] `#003` 5-Tab DApp workspace (Stake, Wrap & Unwrap, Withdrawals, Rewards, Earn).
- [x] `#004` Card on Top -> FAQ Under hierarchy strictly enforced across all 5 DApp tabs.
- [x] `#005` Scroll-to-top reset on tab navigation (`switchTab`).
- [x] `#006` Responsive mobile AI notification simulation banner and landing toast.
- [x] `#007` 38 automated test assertions in `scripts/verify_ui.js`.

### Wave 1.1 SDK & Client Library (✅ Shipped)
- [x] `#008` `@hikari/sdk` client library with NAV calculations and deposit transaction builders.
- [x] `#009` Unbonding ticket status evaluator (cooldown vs claimable).
- [x] `#010` Multi-wallet connection support (Freighter, Lobstr, xBull).

### Wave 1.2 Multi-Strategy Adapters (✅ Shipped)
- [x] `#011` Blend money market lending adapter (`strategy_blend`) - Simulated.
- [x] `#012` Phoenix CLAMM concentrated liquidity adapter (`strategy_phoenix`) - Simulated.
- [x] `#013` Soroswap constant-product liquidity adapter (`strategy_soroswap`) - Simulated.
- [x] `#014` Mandatory 15% liquid native XLM reserve floor.

---

## v2 Observable — Autonomous Keepers & Soroban Oracle

**Thesis**: Automate yield harvesting, cross-DEX MEV capture, and publish verifiable on-chain yield metrics.

### Wave 2.0 Keeper Bot Engine ([-] In Flight)
- [x] `#051` Off-chain keeper policy engine with invariant checks (`engine/src/policyVerifier.ts`).
- [x] `#052` Cryptographic audit logger stream.
- [-] `#053` Open-source Dockerized keeper bot daemon.
- [-] `#054` SDEX-Soroswap atomic MEV arbitrage backrunning loop.

### Wave 2.1 On-Chain Soroban Oracle ([-] In Flight)
- [x] `#055` Oracle specification document (`docs/ORACLE_SPEC.md`).
- [-] `#056` Soroban yield oracle contract deployment on Testnet.
- [ ] `#057` Mainnet oracle publication with 12-hour tick frequency.

---

## v3 Guaranteed — Invariant Enforcement & DeFi Composability

**Thesis**: Guarantee staker solvency through formal mathematical invariants and embed `hXLM` as core collateral across Stellar DeFi.

### Wave 3.0 Safety Sentinel & Circuit Breakers (✅ Foundation Live)
- [x] `#101` Automated Bunker Mode trigger on >10% drawdown (`engine/src/riskEngine.ts`).
- [x] `#102` GateSeal emergency pause integration.
- [ ] `#103` Multi-sig guardian committee key ceremony.

### Wave 3.1 Blend Collateral Listing (⚪ Planned)
- [ ] `#104` Submit Blend listing proposal for `whXLM` static wrapper.
- [ ] `#105` Supply and borrow rate risk modeling.
- [ ] `#106` Liquidation engine integration.

---

## v4 Universal — Agentic AI & x402 Micropayments GA

**Thesis**: Make Hikari the default yield execution layer for autonomous AI agents.

### Wave 4.0 x402 Payment Facilitator
- [x] `#151` x402 specification and architectural blueprint.
- [-] `#152` HTTP 402 payment gateway prototype on Stellar testnet ($0.001 USDC fees).
- [ ] `#153` Production CAIP-2 payment verifier.

### Wave 4.1 Model Context Protocol (MCP) Server
- [x] `#154` MCP tool specifications (`docs/MCP.md`).
- [ ] `#155` `@hikari/mcp` package published to npm.
- [ ] `#156` Reference agent integration in Claude Desktop and Antigravity.

---

## v5 Institutional — ZK-Solvency & Enterprise Vaults

**Thesis**: Provide mathematical certainty of reserves for institutional allocators.

### Wave 5.0 Cryptographic Solvency
- [ ] `#201` Sparse Merkle tree solvency proof generation.
- [ ] `#202` Public zero-knowledge reserve verification dashboard.
- [ ] `#203` Full third-party security audit report published.
