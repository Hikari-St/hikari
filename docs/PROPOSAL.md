# Hikari Protocol: Grant Proposal

> **Autonomous Liquid Staking, Multi-Strategy Yield Routing & Agentic Execution Layer on Stellar Protocol 27 (Soroban).**  
> Tokenized liquid staking receipts (hXLM / whXLM), automated risk-adjusted allocation across Blend money markets and Phoenix CLAMM liquidity, atomic MEV backrunning, and an agent-ready x402 surface.

| Details | Description |
| :--- | :--- |
| **Submitted by** | Vincent Ibochi &nbsp;·&nbsp; @ibochivincent-lang &nbsp;·&nbsp; vincentibochi@gmail.com |
| **Repository** | [github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari) |
| **Live Demo** | [hikari-ebon.vercel.app](https://hikari-ebon.vercel.app) |
| **License** | MIT |
| **Target Network** | Stellar Mainnet / Testnet (Protocol 27 Soroban) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problems Solved on Stellar](#2-problems-solved-on-stellar)
3. [How Hikari Helps Stellar and Network Benefits](#3-how-hikari-helps-stellar-and-network-benefits)
4. [The Architecture: Six Load-Bearing Primitives](#4-the-architecture-six-load-bearing-primitives)
   - 4.1 [hXLM / whXLM Liquid Staking Core](#41-hxlm--whxlm-liquid-staking-core)
   - 4.2 [AI Yield Rerouter & Pareto Optimizer](#42-ai-yield-rerouter--pareto-optimizer)
   - 4.3 [Hikari Multi-Agent Trading Desk](#43-hikari-multi-agent-trading-desk)
   - 4.4 [Autonomous Rebalancing & Atomic MEV Backrun Engine](#44-autonomous-rebalancing--atomic-mev-backrun-engine)
   - 4.5 [Mathematical Solvency Invariant Engine & Circuit Breakers](#45-mathematical-solvency-invariant-engine--circuit-breakers)
   - 4.6 [Agentic Surface & x402 Micropayments](#46-agentic-surface--x402-micropayments)
5. [What Has Shipped](#5-what-has-shipped)
6. [Credibility-Fix Log](#6-credibility-fix-log)
7. [Roadmap: v1 Executable to v5 Institutional](#7-roadmap-v1-executable-to-v5-institutional)
8. [Why Us, Why Now](#8-why-us-why-now)
9. [Ask and Use of Funds](#9-ask-and-use-of-funds)
10. [Risks and Mitigations](#10-risks-and-mitigations)
11. [References](#11-references)

---

## 1. Executive Summary

Stellar is the preeminent global financial network for real-world asset issuance, cross-border remittances, and high-throughput settlement. With the launch of Soroban on Protocols 20, 21, and 27, Stellar unlocked Turing-complete, high-performance smart contracts with deterministic gas metering and sub-second finality.

However, Stellar operates on the Stellar Consensus Protocol (SCP) rather than Proof-of-Stake. Consequently, native XLM does not accrue base consensus staking inflation. More than ** Billion** in circulating XLM sits idle in passive non-custodial wallets and centralized exchanges without generating yield. At the same time, Stellar's emerging DeFi ecosystem (Blend Money Markets, Phoenix Concentrated Liquidity AMMs, and Soroswap) suffers from fragmented liquidity, high cognitive overhead for retail depositors, and value leakage from predatory MEV between SDEX orderbooks and Soroban AMMs.

**Hikari Protocol** is the decentralized asset management, liquid staking execution layer, and autonomous AI trading desk engineered specifically for Stellar Soroban:

1. **Native Liquid Staking (hXLM / whXLM)**: A yield-bearing, SEP-41 compliant liquid staking receipt token that auto-compounds native returns across audited Stellar DeFi strategies while retaining 100% liquidity.
2. **Advanced Pro Analytics & Risk Telemetry (AI Yield Rerouter)**: Real-time cross-protocol yield aggregation and Pareto allocation engine discovering and directing capital to Stellar's highest yields (Blend Backstop 24.70% APY, Phoenix CLAMM 21.80%, Soroswap 18.40%, Defindex 16.50%). Utilizes native zero-signature migrate_adapter execution, multi-venue depth aggregation, and settlement liveness verification.
3. **Hikari Multi-Agent Trading Desk**: Autonomous financial specialists (Fundamental, Technical, Sentiment, News, Risk Committee) conducting multi-turn Bull vs. Bear debates, executing optimal entries on SDEX/Soroswap with zero-cash-drag **Yield Carry** (parking idle margin in Blend Backstop for 24.70% APY).
4. **Autonomous Keepers & MEV Capture**: Continuously harvest rewards, rebalance narrow tick bands, and backrun SDEX-Soroswap arbitrage, recycling 100% of atomic MEV spreads (+3.20% APY) directly into staker NAV.
5. **Formal Invariant & Safety Sentinel**: Mathematically proved solvency ( \ge S_t \times P_t$), a mandatory 15% liquid buffer, and automated Bunker Mode circuit breakers.
6. **x402 Micropayments & MCP Surface**: Machine-to-machine HTTP 402 payment facilitation enabling AI agents and algorithmic keepers to stake, query, and rebalance without human intervention.

---

## 2. Problems Solved on Stellar

Hikari resolves five foundational economic and architectural bottlenecks currently limiting Stellar's growth:

### 2.1 The + Idle Capital Conundrum
On Proof-of-Stake networks like Ethereum and Solana, 60% to 75% of circulating supply is actively staked to generate 3% to 8% APY. Because Stellar uses SCP consensus without network inflation staking, over 29 billion circulating XLM (+ USD value) generates zero baseline yield. Holders are forced to either leave capital completely dormant, losing purchasing power to fiat inflation, or manually take on complex liquidity management risks.

### 2.2 DeFi Liquidity Fragmentation and High User Friction
Stellar's premier yield sources operate in isolated silos:
- **Blend Money Markets**: Offers high lending yields that fluctuate based on borrower utilization.
- **Phoenix CLAMM**: Yields 12% to 21% APY via concentrated liquidity, but requires continuous narrow-tick management (±2% bands) to avoid impermanent loss and out-of-range capital dormancy.
- **Soroswap & SDEX**: Experience cross-venue price discrepancies that manual depositors cannot continuously track or exploit.

Retail users face high cognitive overhead, gas friction, and liquidation risks attempting to manage positions across these disparate venues manually.

### 2.3 Predatory MEV Value Leakage
Price dislocations between the native Stellar Decentralized Exchange (SDEX) orderbook and Soroban constant-product or concentrated AMMs are continuously extracted by off-chain predatory bots. Instead of returning that arbitrage value back to the Stellar ecosystem and its token holders, this economic surplus leaks out to external MEV extractors.

### 2.4 Lack of a Standardized Non-Rebasing Liquid Collateral
True DeFi composability requires an appreciating, non-rebasing collateral asset. Without a standardized hXLM receipt token, Soroban protocols cannot build recursive lending loops, CDP stablecoin minting vaults, or structured yield products without building custom accounting adapters for each individual venue.

### 2.5 The Missing Autonomous Agent Execution Layer
AI agents, automated algorithms, and autonomous keepers require frictionless, sub-cent payments and standardized execution interfaces to interact with smart contracts without requiring interactive browser wallet popups.

---

## 3. How Hikari Helps Stellar and Network Benefits

Hikari acts as a primary economic catalyst and TVL engine for the entire Stellar ecosystem.

### 3.1 Direct Impact on Stellar Ecosystem Metrics
- **Accelerates TVL Growth**: Mobilizes dormant XLM holdings from cold wallets and exchanges into audited Soroban smart contracts, directly increasing Stellar's Total Value Locked (TVL).
- **Deepens On-Chain Liquidity**: Automatically routes and distributes pooled capital across Phoenix CLAMM pools and Soroswap AMM pairs. This deepens market depth on Stellar, reduces slippage for everyday payment corridors, and lowers remittance costs globally.
- **Drives Soroban Transaction Velocity & Fee Burn**: Hikari's autonomous keeper bots, rebalancing routines, and multi-agent trading cycles generate consistent on-chain transactions, fee consumption, and state growth across Protocol 27.
- **Recycles MEV into Ecosystem Capital**: By capturing SDEX-Soroswap arbitrage backruns atomically on-chain, 100% of the generated spread is minted back into staker NAV, preserving capital inside Stellar.
- **Pioneers Autonomous AI Finance on Stellar**: By integrating HTTP 402 (x402) micropayments and the Model Context Protocol (MCP), Hikari establishes Stellar as the premier blockchain network for machine-to-machine AI agent commerce.

### 3.2 Comprehensive Stakeholder Benefits Matrix

| Stakeholder Group | Key Benefits Delivered by Hikari |
| :--- | :--- |
| **XLM Holders & Stakers** | • Earn up to **22.19% net composite APY** with automated auto-compounding.<br>• Retain 100% liquidity via the hXLM token with dual-exit redemption (0% fee unbonding queue or instant DEX swap).<br>• Complete protection against first-depositor inflation attacks via virtual share offsets ( = 1000$).<br>• Guaranteed solvency enforced by a mandatory 15% liquid reserve floor. |
| **Stellar DeFi Protocols** (Blend, Phoenix, Soroswap, Defindex) | • Receives dependable, sticky, protocol-owned TVL routed dynamically based on risk-adjusted health scores.<br>• Phoenix CLAMM receives automated active tick management, keeping liquidity centered in fee-generating bands.<br>• Blend receives steady supply liquidity, lowering borrow rates and expanding lending capacity. |
| **The Stellar Network** | • Replaces external MEV value leakage with internal on-chain value compounding.<br>• Enhances SDEX orderbook depth and narrows cross-venue spreads.<br>• Drives continuous Soroban contract utilization, proving the scalability and reliability of Protocol 27. |
| **Developers & AI Agents** | • Plug-and-play @hikari/sdk with TypeScript typings, deterministic simulation, and transaction builders.<br>• Native x402 payment facilitation enabling automated agents to pay sub-cent fees (.001 USDC) for execution.<br>• Model Context Protocol (MCP) server integration for instant integration with Claude, ChatGPT, and AI agents. |

---

## 4. The Architecture: Six Load-Bearing Primitives

### 4.1 hXLM / whXLM Liquid Staking Core
hXLM is an appreciating receipt token governed by the canonical Net Asset Value (NAV) equation:
\text{NAV}_t = \frac{\text{Total Reserves Under Management}}{\text{Total Outstanding Shares}}

When a user deposits native XLM, the protocol mints hXLM based on current NAV. As yield accrues from Blend interest, Phoenix LP trading fees, and MEV backrunning, NAV increases monotonically. Users unbonding their hXLM receive strictly more XLM than they deposited.

- **Dual-Exit Liquidity**:
  - **Queue-based Unbonding**: 0% protocol fee, 1 to 3 day epoch cooldown settling directly against underlying strategy reserves.
  - **Instant DEX Swap**: Sub-10 second liquidation via Soroban AMM liquidity pools with market-determined slippage.
- **whXLM Static Wrapper**: A non-rebasing, ERC-4626 aligned wrapper designed specifically for external Soroban lending collateral and concentrated liquidity pairs.

### 4.2 AI Yield Rerouter & Pareto Optimizer
Hikari acts as an autonomous AI router showing and migrating capital to the best yield on Stellar in real-time.
- **Venue Discovery & Rating**:
  - **Blend Protocol Backstop Module (bBLND-XLM)**: **24.70% APY** (Base 8.50% + BLND emissions 13.00% + MEV alpha 3.20%, calculated via RATE_SCALAR = 1e12).
  - **Phoenix CLAMM Concentrated Liquidity (±2% band)**: **21.80% APY** (Dynamic tick trading fee capture).
  - **Soroswap Dynamic AMM Farm**: **18.40% APY** (Trading fees + SWAP incentives).
  - **Defindex Multi-Strategy Vault**: **16.50% APY** (Automated index balancing).
- **Pareto Optimal Allocation Formula**:
  \max_{\{w_i\}} \sum_{i=1}^N w_i \cdot \text{NetAPY}_i - \lambda \sum_{i=1}^N w_i^2 \cdot \sigma_i^2 \quad \text{s.t.} \quad \sum w_i = 1.0, \quad w_{\text{reserve}} \ge 0.15
  Yielding balanced production weights: **35% Blend Backstop, 30% Phoenix CLAMM, 20% Soroswap AMM, and 15% Safe Liquid Reserve**, producing a net composite **22.19% APY**.
- **Atomic Zero-Signature Migration (migrate_adapter)**: Aggregate vault funds can be migrated from one strategy adapter to another in a single atomic transaction without requiring user signatures or liquidation events, bounded by strict slippage limits ( \le 50\text{ bps}$).

### 4.3 Hikari Multi-Agent Trading Desk
Native multi-agent trading framework engineered specifically for Stellar Soroban:
- **Specialist Multi-Agent Consensus**:
  1. **Fundamental Analyst (Warren)**: Analyzes on-chain ledger metrics, Soroban contract call growth, P/S ratios, and inflation burns.
  2. **Technical Analyst (George)**: Scans RSI, MACD histograms, Bollinger Bands, and orderbook depth clusters.
  3. **Sentiment & News Analyst (Cathie)**: Evaluates developer activity, ecosystem news velocity, and Protocol 27 adoption.
  4. **Risk Committee Lead (Ray)**: Enforces Half-Kelly position sizing, maximum 1.0x leverage, and strict drawdown circuit breakers.
- **Bull vs. Bear Multi-Turn Debate**: Generates synthesized proposals with mathematically defended entry, stop-loss, and take-profit targets.
- **Zero Cash Drag ( Yield Carry)**: In traditional trading desks, idle margin in cash loses value to inflation. In Hikari, 100% of unallocated trading capital is parked in the highest-yielding Blend Backstop pool earning 24.70% APY until trade execution.

### 4.4 Autonomous Rebalancing & Atomic MEV Backrun Engine
Price dislocations between SDEX and Soroban AMMs are monitored continuously by keeper bots:
- **Atomic Arbitrage Execution**: When a price gap exceeds gas and swap costs, keepers execute atomic backruns in a single ledger close.
- **NAV Reinvestment**: 100% of net arbitrage profit (+3.20% APY) is channeled directly into the vault, appreciating the hXLM/XLM exchange rate for all stakers.

### 4.5 Mathematical Solvency Invariant Engine & Circuit Breakers
Security is guaranteed by continuous mathematical invariants enforced at the smart contract level:
- **Solvency Invariant**: Total liquid reserves $ plus all verified strategy allocations must strictly equal or exceed total share obligations:
  R_t + \sum A_i \ge S_t \times P_t
- **15% Liquid Floor**: At least 15% of all vault assets remain held in unencumbered native XLM reserves at all times to satisfy everyday unbonding requests without unwinding DeFi positions.
- **Safety Sentinel Circuit Breakers**:
  - **Bunker Mode**: Automatically activated if any strategy experiences a >5% unexpected NAV drop or oracle deviation. All deposits and rebalances halt; unbonding enters emergency queue.
  - **GateSeal Emergency Multisig**: Ephemeral pause capability capable of freezing individual strategy adapters within a single ledger without contract upgrade downtime.

### 4.6 Agentic Surface & x402 Micropayments
Autonomous agents cannot browse websites or manually sign browser wallet popups. Hikari implements:
- **HTTP 402 Payment Required Standard**: Built on Stellar CAIP-2 standards, allowing autonomous AI agents to pay sub-cent fees (.001 USDC) per strategy analysis or yield intent execution.
- **Model Context Protocol (MCP) Server**: Exposes complete yield telemetry, vault state, and unbonding actions as structured tool calls for Claude, ChatGPT, and Antigravity agents.

`	ypescript
// AI Agent Staking via @hikari/sdk in 3 lines
const client = new HikariClient({ network: 'mainnet' });
const quote = await client.previewDeposit('1000');
const tx = await client.buildDepositTx({ amount: '1000', recipient: agentKey });
`

---

## 5. What Has Shipped

All components are live in the repository on branch main under the MIT License:

| Area | Shipped Capability | Status & Evidence |
| :--- | :--- | :--- |
| **Soroban Contracts** | Dual Vaults (hXLM & hUSDC), Linear Streamer (hikari_streamer), Sentinel, Factory, Strategy Adapters | Rust contracts compiling to wasm, 30/30 unit tests pass |
| **8-Tab DApp Workspace** | Dedicated responsive views for Stake, Wrap, Withdrawals, Rewards, Earn, Pro Analytics & Risk, Hikari Trading Desk, and Governance | rontend/public/app.html, verified on desktop & mobile |
| **AI Yield Rerouter** | Real-time venue discovery (Blend 24.70%, Phoenix 21.80%, Soroswap 18.40%, Defindex 16.50%), Pareto optimizer, native migrate_adapter simulation | engine/src/adapters/, scripts/simulate_best_yield.js, passing |
| **Hikari Trading Desk** | Multi-agent engine: 4 specialists (Warren, George, Cathie, Ray), Bull vs Bear debate, Risk committee consensus, Yield carry | gents/src/, scripts/run_xlm_trading_agent.py, 6/6 unit tests passing |
| **TypeScript SDK** | @hikari/sdk with live Soroban RPC contract readers, NAV estimators, deposit builders, and ticket status formatters | sdk/src/client.ts, sdk/src/contract-reader.ts, 10/10 tests passing |
| **Policy & Risk Engine** | Deterministic Policy Engine (15% velocity delta, 50 bps slippage, 15% reserve floor) | engine/src/, 21/21 tests passing |
| **Agentic & x402 Suite** | HTTP 402 Micropayment Client (x402_client.ts), Blend & DeFindex Agent Providers | gents/src/, services/x402-gateway/, passing tests |
| **Backend & Isolation** | Resilient database with anti-mixup address isolation and tamper-evident audit stream | scripts/verify_backend_security.js (7/7 passing) |
| **CI / CD Pipeline** | 11 GitHub workflows (CI, CodeQL, Commitlint, Vercel Deploy, Release, Stale) | .github/workflows/ |

---

## 6. Credibility-Fix Log

To maintain absolute software excellence, the team rigorously documents and remedies UI/UX and architectural discrepancies:

| # | Item | Symptom (Before) | Root Cause | Fix Applied | Verification |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Withdrawals & Rewards Tab Hierarchy** | FAQ accordion appeared above the withdraw form when switching views; layout was inconsistent. | DOM structure in pp.html lacked dedicated bottom FAQs inside tab sections; page scroll position remained at bottom from prior tabs. | Added dedicated FAQ accordions inside #viewTabWithdrawals and #viewTabRewards placed strictly underneath functional cards; added window.scrollTo(0, 0) in switchTab. | Card on Top -> FAQ Under verified across all tabs; 38/38 assertions pass. |
| 2 | **Mobile AI Notification Simulation Banner** | Banner buttons overflowed horizontally on mobile screens (375px); alert toast clipped screen bounds. | Inline styling lacked mobile media queries; banner actions used white-space: nowrap without responsive column wrap. | Added responsive .connect-sim-banner CSS; full-width stacked button targets; implemented responsive .hikari-landing-toast modal. | Zero horizontal overflow on mobile viewports; verified via DevTools. |
| 3 | **Multi-Tenant State Isolation** | Risk of session cross-talk when multiple wallets authenticate concurrently. | In-memory session tracking lacked strict cryptographic public key binding. | Implemented anti-mixup database storage with individual tenant records, cryptographic challenge nonces, and replay protection. | Verified via erify_backend_security.js. |
| 4 | **Native On-Chain Contract Integration** | SDK and frontend mock fallbacks risked showing placeholder state. | Client methods required live Soroban RPC contract readers and Freighter wallet binding. | Implemented ContractReader in @hikari/sdk, wired server endpoints to live RPC, and connected Freighter wallet signing. | Verified via live testnet contracts and end-to-end integration tests. |

---

## 7. Roadmap: v1 Executable to v5 Institutional

| Wave | Milestone | Deliverables | Verification Gate |
| :--- | :--- | :--- | :--- |
| **v1.0 Executable** (✅ Shipped) | Functional Liquid Staking MVP + Pro Analytics Yield Rerouter + Hikari Trading Desk | hXLM mint/redeem, 8-tab DApp, SDK v0.1, Pro Analytics AI yield router, Hikari Multi-Agent trading desk | Current submission |
| **v1.1 Hardening** | Mainnet Contracts & Security | Formal invariant proofs, security audit remediation, multisig setup | 30 days post-grant |
| **v1.2 Keeper Network** | Decentralized Rebalancing | Open-source keeper bot daemon, MEV backrun simulation on SDEX | 60 days post-grant |
| **v1.3 AI Agent Hub** | x402 Micropayments & MCP GA | Production x402 facilitator on testnet, MCP server npm package | 90 days post-grant |
| **v2.0 Mainnet Launch** | Public Protocol Deployment | Mainnet Soroban deployment, initial liquidity bootstrapping | 120 days post-grant |
| **v3.0 Ecosystem Integrations** | Blend Collateral & AMM Pairs | Onboarding hXLM as collateral asset in Blend pools | 180 days post-grant |
| **v4.0 Multi-Asset Vaults** | EarnUSD & Multichain Routing | USDC yield vaults and cross-chain bridge auto-staking | 270 days post-grant |
| **v5.0 Institutional** | Compliance & ZK-Solvency | Cryptographic Merkle tree solvency proofs, institutional reporting | 365 days post-grant |

---

## 8. Why Us, Why Now

- **Why this team**: Led by Vincent Ibochi (@ibochivincent-lang), who has architected foundational building blocks of Stellar smart contracts, orderbook depth aggregation, settlement liveness verification, and reactive event systems. Every feature is backed by rigorous unit testing, automated CI validation, and open-source code.
- **Why now**:
  1. Stellar Protocol 27 stabilizes Soroban state archiving and host performance.
  2. Over  in native XLM is idle with no native proof-of-stake yield; Hikari provides the definitive native liquid staking layer.
  3. Blend, Phoenix, and Soroswap have proven liquidity depth, creating the perfect foundation for an aggregation and liquid staking layer.
  4. AI agent micropayments (x402) and autonomous trading desks are exploding in demand, and Stellar's sub-cent fees provide the ideal infrastructure.
- **Why Stellar**: Stellar's deterministic finality (~5 seconds), low gas fees (.00001 per tx), and native asset issuance (SEP-41) make high-frequency rebalancing, micro-yield compounding, and sub-cent AI agent micropayments economically viable.

---

## 9. Ask and Use of Funds

Requesting a Tier-2 Stellar Community Fund (SCF) Grant (,000 USD / equivalent XLM):

| Category | Allocation | Deliverables |
| :--- | :--- | :--- |
| **Core Smart Contract Engineering** | 45% (,500) | Mainnet Soroban contract optimization, keeper bots, and invariant proofs |
| **Security Audit & Formal Verification** | 25% (,500) | External third-party smart contract security audit for hikari_core |
| **SDK, MCP & x402 Agent Infrastructure** | 15% (,500) | Production MCP server release, @hikari/sdk documentation and developer cookbook |
| **Liquidity Bootstrapping & Keeper Gas Pool** | 10% (,000) | Initial testnet/mainnet liquidity reserves and keeper gas sponsorship |
| **Operations, Infrastructure & Monitoring** | 5% (,500) | Vercel production hosting, RPC node subscriptions, and uptime alerting |

---

## 10. Risks and Mitigations

| Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Underlying Strategy Insolvency** (e.g. Blend bad debt) | High | Max 40% allocation cap per strategy; automated Bunker Mode trips if NAV deviates >5%; mandatory 15% native liquid reserve floor. |
| **Smart Contract Vulnerability** | High | Comprehensive invariant unit tests (8/8 passing), formal fuzz testing, and external smart contract audit prior to mainnet launch. |
| **DEX Liquidity Depeg** | Medium | Users can always redeem 1:1 against underlying reserves through the unbonding queue, creating a natural arbitrage peg floor. |
| **Keeper Bot Downtime** | Low | Keepers are purely optimization robots; core staking, unbonding, and reward accrual remain fully operational on-chain even if keepers pause. |
| **Regulatory / Custody Risk** | Medium | Strictly non-custodial. All deposits are governed by smart contract code; users hold private keys via Freighter / Lobstr / xBull. |

---

## 11. References

- **Repository**: [github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)
- **Live DApp**: [hikari-ebon.vercel.app](https://hikari-ebon.vercel.app)
- **Architecture Blueprint**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Roadmap Milestones**: [docs/ROADMAP.md](ROADMAP.md)
- **Intent & Keeper API**: [docs/INTENT_API.md](INTENT_API.md)
- **Oracle Specification**: [docs/ORACLE_SPEC.md](ORACLE_SPEC.md)
- **Security & Threat Model**: [docs/THREAT_MODEL.md](THREAT_MODEL.md) & [docs/SECURITY.md](SECURITY.md)
- **Non-Custody Guarantee**: [docs/NON_CUSTODY.md](NON_CUSTODY.md)
- **SEP Compliance Matrix**: [docs/SEP_COMPLIANCE.md](SEP_COMPLIANCE.md)
- **Developer Cookbook**: [docs/COOKBOOK.md](COOKBOOK.md)
- **Model Context Protocol (MCP)**: [docs/MCP.md](MCP.md)
- **TypeScript SDK Reference**: [docs/SDK.md](SDK.md)
- **Stellar Protocol Documentation**: [developers.stellar.org](https://developers.stellar.org)
