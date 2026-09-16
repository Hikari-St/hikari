# Hikari Protocol (光)

[![License: MIT](https://img.shields.io/github/license/ibochivincent-lang/hikari?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/ibochivincent-lang/hikari/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/ibochivincent-lang/hikari/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-31%20Rust%20%2B%205%20TS-brightgreen?style=flat-square)](https://github.com/ibochivincent-lang/hikari)
[![SDK](https://img.shields.io/badge/%40hikari%2Fsdk-v0.1.0-blue?style=flat-square&logo=typescript)](sdk)
[![Deployed on Vercel](https://img.shields.io/badge/deploy-vercel-000?style=flat-square&logo=vercel)](https://hikari-ebon.vercel.app)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-fe5196?style=flat-square&logo=conventionalcommits)](https://www.conventionalcommits.org)

**Autonomous Liquid Staking (`hXLM`), AI Yield Rerouter &amp; Hikari Multi-Agent Trading Desk on Stellar Protocol 27 (Soroban).**

Hikari is the decentralized asset management, liquid staking execution layer, and autonomous AI trading desk built natively for Stellar:
1. **Native Liquid Staking (`hXLM` / `whXLM`)**: Tokenizes staked XLM into an appreciating, SEP-41 compliant receipt token auto-compounding native returns across audited Stellar DeFi strategies while retaining 100% liquidity.
2. **Pro Analytics & Risk Telemetry (Yield Router, testnet demo)**: A vault-adapter architecture that can route capital across multiple Soroban adapter contracts. Today the Blend/Phoenix/Soroswap adapters are **self-contained simulated-yield contracts** deployed to testnet (fixed-rate internal accrual, no live call into the real Blend/Phoenix/Soroswap protocols yet) — see [Live Stellar Testnet Deployments](#live-stellar-testnet-deployments) for exactly which contracts are real vs. simulated.
3. **Hikari Trading Desk**: A technical-signal dashboard computing live RSI/ATR from real Stellar Horizon `trade_aggregations` (with a CoinGecko price fallback) to produce a rule-based long/short/hold signal with stop-loss/take-profit bounds. It is a single deterministic indicator engine, not a multi-agent LLM debate.
4. **Autonomous Keepers & MEV Capture**: Keeper bot (`engine/src/agents/keeper_bot.ts`) monitors SDEX/Soroban AMM spreads for atomic backrun opportunities. Realized yield from this is not yet measured or reported — no APY figure is claimed.
5. **Formal Invariant & Safety Sentinel**: Mathematically proved solvency ($R_t \ge S_t \times P_t$), a mandatory 15% liquid buffer, and automated Bunker Mode circuit breakers.
6. **x402 Micropayments & MCP Surface**: Machine-to-machine HTTP 402 payment facilitation enabling AI agents and algorithmic keepers to stake, query, and rebalance without human intervention.

<p align="center">
  <em>Live demo → <a href="https://hikari-ebon.vercel.app">hikari-ebon.vercel.app</a></em>
</p>

---

## Table of contents

- [Why this exists](#why-this-exists)
- [How Hikari helps Stellar](#how-hikari-helps-stellar)
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

## How Hikari helps Stellar

Hikari directly reinforces Stellar's network economy and drives on-chain adoption:

- **Accelerates Total Value Locked (TVL)**: Mobilizes idle XLM from centralized exchanges and offline wallets into Soroban contracts, increasing Stellar's on-chain TVL metrics.
- **Deepens Liquidity Across Corridors**: Routes pooled capital across Phoenix concentrated tick bands and Soroswap AMM pairs, reducing trading slippage for real-world payment corridors and remittances.
- **Increases Soroban Transaction Velocity**: Hikari's autonomous keeper bots, rebalancing algorithms, and multi-agent trading cycles generate constant, deterministic on-chain activity and contract call volume on Protocol 27.
- **Recycles MEV into the Ecosystem**: Replaces extractive MEV bots with internal atomic arbitrage backruns, returning 100% of captured profits directly into staker NAV.
- **Pioneers AI Agent Infrastructure on Stellar**: Integrates HTTP 402 (x402) micropayments and Model Context Protocol (MCP) tooling, positioning Stellar as the leading network for machine-to-machine AI agent commerce.

---

## Why Stellar Protocol 27

Hikari is purpose-built for Stellar and could not exist with the same guarantees on another chain:
- **Sub-Second Finality & Sub-Cent Fees**: Deterministic ledger closes (~5 seconds) with gas fees under $0.00002 enable frequent autonomous rebalancing and MEV capture that would be cost-prohibitive on Ethereum or Solana.
- **Native SEP-41 & Stellar Asset Contract (SAC)**: Zero-friction wrapping between classic Stellar accounts and Soroban smart contract environments.
- **Stellar Anchor Rails (SEP-24 & SEP-6)**: Enables direct-to-bank fiat off-ramps (USD, EUR, NGN, GBP, BRL) directly from the DApp withdrawal interface.

---

## The six load-bearing primitives

1. **hXLM / whXLM Liquid Staking Core**:
   - SEP-41 compliant receipt token whose Net Asset Value (NAV) appreciates monotonically against XLM.
   - Dual-exit liquidity: 0% protocol fee queue unbonding (1–3 days) or instant DEX swap (~10s).
   - `whXLM` static wrapper for external money market collateral (Blend).
2. **Pro Analytics & Risk Telemetry (Yield Router, testnet demo)**:
   - Vault contract can allocate across multiple Soroban adapter contracts (Blend, Phoenix, Soroswap adapters deployed to testnet).
   - **Current status: the deployed Blend/Phoenix/Soroswap adapters are simulated-yield contracts** — each accrues interest internally off a configured fixed rate and does not yet make a cross-contract call into the real Blend, Phoenix, or Soroswap protocols. Allocation weights and blended-APY figures shown in the app are illustrative of the intended routing logic, not live third-party yield.
   - Native `migrate_adapter` integration for atomic zero-user-signature migrations.
3. **Hikari Trading Desk & Yield Carry**:
   - Single technical-signal engine (RSI/ATR on live Horizon/CoinGecko price data) producing a long/short/hold call with stop-loss and take-profit bounds — not a multi-agent LLM debate.
   - Zero-Cash-Drag **Yield Carry**: routes unallocated trading margin into the Blend adapter described above (simulated-yield contract, testnet).
4. **Autonomous Rebalancing & Atomic MEV Backrunning**:
   - Keeper bot (`engine/src/agents/keeper_bot.ts`) monitors SDEX/Soroban AMM spreads and constructs atomic backrun transactions when spread exceeds a configured threshold.
   - Realized APY from backrunning is not yet measured/reported on-chain; no historical yield number is claimed.
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
| :--- | :--- |
| **Smart Contracts** | Soroban Rust (`wasm32-unknown-unknown`), Stellar Protocol 27 |
| **Client SDK** | `@hikari/sdk` (TypeScript, `@stellar/stellar-sdk` v13+) |
| **AI Trading & Routing** | Hikari Multi-Agent Framework, Native Yield Adapters, VWAP Depth Aggregator |
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

# Run Hikari Multi-Agent Trading Desk Cycle
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

This table is generated from [`deployed_contracts.json`](deployed_contracts.json), the same file the app reads at runtime — it will not drift from what's actually deployed. Adapters marked **(Simulated yield)** hold funds and account interest internally but do not yet call the named external protocol.

| Contract | Address / ID | Explorer |
| -------- | ------------ | -------- |
| **Hikari Core Vault (XLM)** | `CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5) |
| **Hikari Core Vault (USDC)** | `CAWPVCC5PWCU47LUH4AZDXILYJY3CPNPOTRURYNFDEPLVAALFRWUJEUM` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAWPVCC5PWCU47LUH4AZDXILYJY3CPNPOTRURYNFDEPLVAALFRWUJEUM) |
| **Linear Yield Streamer** | `CDCAAPOIUGGSXWDLJ3WMRAGOC3SI2TRK6I2XP7D5QL3MDSF27XO67EPP` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDCAAPOIUGGSXWDLJ3WMRAGOC3SI2TRK6I2XP7D5QL3MDSF27XO67EPP) |
| **hXLM Share Token (SEP-41)** | `CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH) |
| **Strategy Registry** | `CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ) |
| **Withdrawal Queue** | `CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ) |
| **Policy Account** | `CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP) |
| **Blend Adapter (Simulated yield)** | `CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL) |
| **Phoenix Adapter (Simulated yield)** | `CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5) |
| **Soroswap Adapter (Simulated yield)** | `CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3) |
| **GateSeal Circuit Breaker** | `CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ) |
| **Oracle** | `CAEPCI2TEPENZZBGSMSQEL3W6IW7TYBXRKGXU25J56LQUC33NXJXF6S6` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CAEPCI2TEPENZZBGSMSQEL3W6IW7TYBXRKGXU25J56LQUC33NXJXF6S6) |
| **Governance** | `CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID) |
| **Fee Controller** | `CDD6XCT7TD3AWEYMQM7XDFPFDQUZUFUTRVUY3MDNCHPV4SUU4R3OA473` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDD6XCT7TD3AWEYMQM7XDFPFDQUZUFUTRVUY3MDNCHPV4SUU4R3OA473) |
| **Native XLM SAC** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| **Underlying USDC SAC** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA) |

**Mainnet**: not deployed. `deployed_mainnet.json` is a governance/multisig *plan* only (see file for status).

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
