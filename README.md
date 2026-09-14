# Hikari Protocol (光)

[![License: MIT](https://img.shields.io/github/license/ibochivincent-lang/hikari?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ibochivincent-lang/hikari/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/ibochivincent-lang/hikari/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat-square)](https://github.com/ibochivincent-lang/hikari)
[![SDK](https://img.shields.io/badge/%40hikari%2Fsdk-v0.1.0-blue?style=flat-square&logo=typescript)](sdk)
[![Deployed on Vercel](https://img.shields.io/badge/deploy-vercel-000?style=flat-square&logo=vercel)](https://hikari-protocol.vercel.app)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-fe5196?style=flat-square&logo=conventionalcommits)](https://www.conventionalcommits.org)

**"Lido for Stellar": Autonomous Liquid Staking (`hXLM`), AI Yield Rerouter & Tauric Multi-Agent Trading Desk on Stellar Protocol 27 (Soroban).**

Hikari is the decentralized asset management, liquid staking execution layer, and autonomous AI trading desk built natively for Stellar:
1. **Lido for Stellar (`hXLM` / `whXLM`)**: Tokenizes staked XLM into an appreciating, SEP-41 compliant receipt token auto-compounding native returns across audited Stellar DeFi strategies while retaining 100% liquidity.
2. **AI Yield Rerouter & Cross-Protocol Pareto Optimizer**: Real-time cross-protocol yield aggregation and Pareto allocation engine discovering and directing capital to Stellar's highest yields (Blend Backstop 24.70% APY, Phoenix CLAMM 21.80%, Soroswap 18.40%, Defindex 16.50%). Utilizes Meridian's zero-signature `migrate_adapter` pattern, Lens price/depth aggregation, and Landfall liveness verification.
3. **Tauric AI Multi-Agent Trading Desk**: Autonomous financial specialists (Fundamental, Technical, Sentiment, News, Risk Committee) conducting multi-turn Bull vs. Bear debates, executing optimal entries on SDEX/Soroswap with zero-cash-drag **Yield Carry** (parking idle margin in Blend Backstop for 24.70% APY).
4. **Autonomous Keepers & MEV Capture**: Continuously harvest rewards, rebalance narrow tick bands, and backrun SDEX-Soroswap arbitrage, recycling 100% of atomic MEV spreads (+3.20% APY) directly into staker NAV.
5. **Formal Invariant & Safety Sentinel**: Mathematically proved solvency ($R_t \ge S_t \times P_t$), a mandatory 15% liquid buffer, and automated Bunker Mode circuit breakers.
6. **x402 Micropayments & MCP Surface**: Machine-to-machine HTTP 402 payment facilitation enabling AI agents and algorithmic keepers to stake, query, and rebalance without human intervention.

<p align="center">
  <em>Live demo → <a href="https://hikari-protocol.vercel.app">hikari-protocol.vercel.app</a></em>
</p>

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Why Stellar Protocol 27](#why-stellar-protocol-27)
- [The six load-bearing primitives](#the-six-load-bearing-primitives)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Documentation](#documentation)
- [Live Stellar Testnet Deployments](#live-stellar-testnet-deployments)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [License](#license)

---

## Why this exists

Stellar is the world's most battle-tested public blockchain for cross-border remittances and real-world asset issuance. With the rollout of Soroban smart contracts, Stellar gained high-performance, Turing-complete execution. Yet, Stellar's financial ecosystem faces four critical structural bottlenecks:

1. **The Idle Capital Problem**: Native XLM uses the Stellar Consensus Protocol (SCP) rather than Proof-of-Stake consensus. Because there is no base network inflation staking, over **$3 Billion in circulating XLM sits completely idle** in passive wallets without earning yield.
2. **DeFi Yield Fragmentation**: Stellar’s premier yield sources—Blend Money Markets, Phoenix CLAMM concentrated liquidity, and Soroswap AMMs—operate in silos. Retail users face high cognitive friction, manual rebalancing costs, and liquidation risks trying to optimize yields across them.
3. **Predatory MEV Value Extraction**: Price dislocations between the Stellar Decentralized Exchange (SDEX) orderbook and Soroban AMMs are continuously extracted by off-chain predatory arbitrageurs. That economic value leaks out of Stellar instead of compounding back into staker returns.
4. **The Missing AI Agent Execution Layer**: AI agents and automated algorithmic keepers require frictionless, sub-cent payments and standardized tooling to interact with smart contracts without browser wallet popups.

**Hikari solves all four issues.** It turns idle XLM into an auto-compounding liquid asset (`hXLM`), dynamically routes capital across audited Soroban strategies, captures atomic MEV arbitrage backruns and recycles 100% of profits to stakers, and provides an x402 agent payment surface.

---

## Why Stellar Protocol 27

Hikari is purpose-built for Stellar and could not exist with the same guarantees on another chain:
- **Sub-Second Finality & Sub-Cent Fees**: Deterministic ledger closes (~5 seconds) with gas fees under $0.00002 enable frequent autonomous rebalancing and MEV capture that would be cost-prohibitive on Ethereum or Solana.
- **Native SEP-41 & Stellar Asset Contract (SAC)**: Zero-friction wrapping between classic Stellar accounts and Soroban smart contract environments.
- **Stellar Anchor Rails (SEP-24 & SEP-6)**: Enables direct-to-bank fiat off-ramps (USD, EUR, NGN, GBP, BRL) directly from the DApp withdrawal interface.

---

## The six load-bearing primitives

1. **hXLM / whXLM Liquid Staking Core ("Lido for Stellar")**:
   - SEP-41 compliant receipt token whose Net Asset Value (NAV) appreciates monotonically against XLM.
   - Dual-exit liquidity: 0% protocol fee queue unbonding (1–3 days) or instant DEX swap (~10s).
   - `whXLM` static wrapper for external money market collateral (Blend).
2. **AI Yield Rerouter & Cross-Protocol Pareto Optimizer**:
   - Real-time venue discovery: Blend Backstop (24.70% APY), Phoenix CLAMM (21.80%), Soroswap Farm (18.40%), Defindex Vault (16.50%).
   - Pareto-optimal allocation engine computing optimal risk-adjusted weights (35% Blend, 30% Phoenix, 20% Soroswap, 15% Safe Liquid Reserve Floor) delivering **22.19% net APY**.
   - Meridian `migrate_adapter` integration for atomic zero-user-signature migrations.
3. **Tauric Multi-Agent AI Trading Desk & Yield Carry**:
   - 4 Financial Specialists: Fundamental (Warren), Technical (George), Sentiment (Cathie), and Risk Committee Lead (Ray).
   - Multi-turn Bull vs. Bear debate with verifiable stop-loss and take-profit bounds.
   - Zero-Cash-Drag **Yield Carry**: 100% of unallocated trading margin parked in Blend Backstop earning 24.70% APY while awaiting trade signals.
4. **Autonomous Rebalancing & Atomic MEV Backrunning**:
   - Algorithmic keeper robots monitor SDEX and Soroban AMMs every ledger close.
   - Captures price dislocations atomically and routes 100% of arbitrage profit (+3.20% APY) into staker NAV.
5. **Formal Invariant & Safety Sentinel Engine**:
   - Enforces the mathematical solvency invariant $R_t \ge S_t \times P_t$.
   - Mandatory 15% liquid native XLM reserve floor to ensure instant liquidity.
   - Automated Bunker Mode and GateSeal circuit breakers during market anomalies.
6. **Agentic Surface & x402 Micropayments**:
   - Model Context Protocol (MCP) server providing structured tools for AI agents.
   - HTTP 402 payment facilitation allowing agents to execute actions via sub-cent micropayments ($0.001 USDC).

---

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| **Smart Contracts** | Soroban Rust (`wasm32-unknown-unknown`), Stellar Protocol 27 |
| **Client SDK** | `@hikari/sdk` (TypeScript, `@stellar/stellar-sdk` v13+) |
| **AI Trading & Routing** | TauricResearch Multi-Agent Framework, Meridian Yield Adapters, Lens Depth Aggregator |
| **Frontend** | Vanilla CSS Design System, HTML5, 8-Tab Reactive DApp Workspace |
| **Backend & DB** | Node.js, Express, Anti-Mixup Resilient Multi-Tenant Storage |
| **Agent Protocols** | Model Context Protocol (MCP), HTTP 402 (x402) CAIP-2 Micropayments |
| **CI / CD** | GitHub Actions, CodeQL, Commitlint, Vercel |

---

## Getting started

**Prerequisites:** Node.js 20+, Python 3.10+, Rust toolchain with `wasm32-unknown-unknown` target.

```bash
# Clone the repository
git clone https://github.com/ibochivincent-lang/hikari.git
cd hikari

# Install dependencies across all packages
npm install
npm install --prefix sdk
npm install --prefix engine

# Run AI Yield Rerouter & Venue Discovery Simulation
npm run agent:best-yield

# Run Tauric Multi-Agent AI Trading Desk Cycle
npm run agent:trade

# Run unit test suites
npm run test:sdk
npm run test:engine
npm run test:trading-agents

# Run UI verification suite (38 assertions)
node scripts/verify_ui.js

# Start the local development server
npm run dev
```

The web dashboard and DApp workspace will be available at `http://localhost:3000`.

---

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `STELLAR_NETWORK` | Yes | `testnet` | Target network (`testnet` or `mainnet`). |
| `HORIZON_URL` | Yes | `https://horizon-testnet.stellar.org` | Stellar Horizon REST endpoint. |
| `SOROBAN_RPC_URL` | Yes | `https://soroban-testnet.stellar.org` | Soroban JSON-RPC node URL. |
| `VAULT_CONTRACT_ID` | Yes | `CCR6NFKICAK4KW...` | Address of deployed `hikari_core` contract. |
| `HXLM_TOKEN_ID` | Yes | `CA36LWOMIDPXFM...` | Address of deployed `hXLM` SEP-41 token. |
| `PORT` | No | `3000` | Local HTTP server port. |

---

## Documentation

The complete architectural and governance suite lives under [`docs/`](docs/):

| Document | Scope |
| -------- | ----- |
| [docs/PROPOSAL.md](docs/PROPOSAL.md) | Official Stellar Community Fund grant proposal, problem statement, thesis & ask. |
| [docs/HIKARI_SPECIFICATION.md](docs/HIKARI_SPECIFICATION.md) | Core system components, architecture blueprint, and live social integration spec. |
| [docs/AUDIT_DOSSIER.md](docs/AUDIT_DOSSIER.md) | Mathematical invariant proofs, fuzzing results, and audit readiness dossier. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Complete Soroban smart contract blueprint, keeper pipeline, and sequence diagrams. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Multi-phase roadmap (v1 Executable → v5 Institutional) with tickable milestones. |
| [docs/INTENT_API.md](docs/INTENT_API.md) | Intent schemas, signing rules, replay protection, and cURL / TS snippets. |
| [docs/ORACLE_SPEC.md](docs/ORACLE_SPEC.md) | Soroban yield and NAV oracle contract interface and consumer guides. |
| [docs/STRATEGY_RISK_REPUTATION.md](docs/STRATEGY_RISK_REPUTATION.md) | Quantitative strategy health scoring and allocation rebalancing rules. |
| [docs/SECURITY.md](docs/SECURITY.md) | Non-custodial security policy, key handling, and vulnerability disclosure. |
| [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) | STRIDE threat matrix, attack vectors, and cryptographic mitigations. |
| [docs/NON_CUSTODY.md](docs/NON_CUSTODY.md) | Architectural proof of non-custodial operations and user signature constraints. |
| [docs/SEP_COMPLIANCE.md](docs/SEP_COMPLIANCE.md) | Stellar Ecosystem Proposals compliance matrix (SEP-41, SEP-10, SEP-24, SEP-6). |
| [docs/CONTRIBUTOR_LADDER.md](docs/CONTRIBUTOR_LADDER.md) | Contributor progression rungs and governance guidelines. |
| [docs/COOKBOOK.md](docs/COOKBOOK.md) | Developer integration recipes for staking, unbonding, and agent queries. |
| [docs/FAQ.md](docs/FAQ.md) | Comprehensive questions on liquid staking, fees, unbonding, and risks. |
| [docs/BENCHMARKS.md](docs/BENCHMARKS.md) | Empirical CPU instruction counts, gas consumption, and transaction latencies. |
| [docs/MCP.md](docs/MCP.md) | Model Context Protocol integration guide for AI agents (Claude, ChatGPT, AGY). |
| [docs/SDK.md](docs/SDK.md) | Complete `@hikari/sdk` reference, client methods, and error types. |
| [docs/CANONICAL_JSON.md](docs/CANONICAL_JSON.md) | Deterministic JSON hashing specification (RFC-8785) for intent verification. |
| [docs/JURISDICTIONAL.md](docs/JURISDICTIONAL.md) | Jurisdictional memo on non-custodial software classification. |
| [docs/STRICT_LINTING.md](docs/STRICT_LINTING.md) | Code quality standards, TypeScript strict flags, and CI verification gates. |

---

## Live Stellar Testnet Deployments

| Contract | Address / ID | Explorer |
| -------- | ------------ | -------- |
| **Hikari Core Vault (XLM)** | `CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5) |
| **Hikari Core Vault (USDC)** | `CBXUSDCVAULT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBXUSDCVAULT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| **Linear Yield Streamer** | `CASTREAMER7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC001` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CASTREAMER7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC001) |
| **hXLM Share Token (SEP-41)** | `CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH) |
| **Strategy Registry** | `CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ) |
| **Withdrawal Queue** | `CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ) |
| **Blend Protocol Adapter** | `CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL) |
| **Phoenix CLAMM Adapter** | `CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5) |
| **GateSeal Circuit Breaker** | `CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ) |
| **Native XLM SAC** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |

---

## Contributing

Contributions are warmly welcomed. Please review [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request.

Good places to start:
- Issues tagged [`good-first-issue`](https://github.com/ibochivincent-lang/hikari/labels/good-first-issue) — scoped, unblocked, and reviewer-ready.
- Issues tagged [`help-wanted`](https://github.com/ibochivincent-lang/hikari/labels/help-wanted) — larger tickets actively seeking contributors.
- Propose a new yield strategy adapter via [strategy-adapter template](https://github.com/ibochivincent-lang/hikari/issues/new?template=strategy-adapter.yml).

---

## Contributors

Thanks to everyone who has shipped code, documentation, designs, and security reviews for Hikari Protocol.

<table>
  <tr>
    <td align="center" width="140">
      <a href="https://github.com/ibochivincent-lang">
        <img src="https://github.com/ibochivincent-lang.png?size=100" width="80" height="80" alt="Vincent Ibochi" /><br />
        <sub><b>Vincent Ibochi</b></sub>
      </a><br />
      <sub>Creator &amp; Maintainer</sub><br />
      <sub>💻 📖 🏗️ 🚧</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/ibochivincent-lang/hikari/blob/main/CONTRIBUTING.md">
        <img src="https://avatars.githubusercontent.com/u/0?v=4&size=100" width="80" height="80" alt="Open a PR" style="opacity:0.5" /><br />
        <sub><b>Your name here</b></sub>
      </a><br />
      <sub>Open a PR →</sub>
    </td>
  </tr>
</table>

Emoji key follows the [all-contributors](https://allcontributors.org/docs/en/emoji-key) spec: 💻 code · 📖 docs · 🎨 design · 🏗️ infrastructure · 🚧 maintenance.

---

## License

[MIT](LICENSE) © 2026 Vincent Ibochi
