# Hikari Protocol — Strategy Risk & Reputation Scoring

> **Quantitative Risk Framework for Onboarding and Monitoring Soroban Yield Strategies**
> Defines the composite health score, liquidity metrics, automatic allocation rebalancing weights, and dispute mechanisms for underlying Stellar protocols.

---

## 1. Overview

Hikari routes user deposits across multiple decentralized venues on Stellar (Blend Money Markets, Phoenix CLAMM, Soroswap AMMs). To ensure capital is allocated strictly to healthy, solvent protocols, Hikari executes continuous algorithmic risk evaluations.

Every strategy adapter is assigned a real-time **Strategy Health Score (SHS)**:
$$0 \le \text{SHS} \le 100$$

Strategies with higher health scores receive greater portfolio allocation weights (up to the 40% protocol cap), while degraded strategies are automatically unwound.

---

## 2. Composite Health Score Formula

The Strategy Health Score is calculated as:

$$\text{SHS} = w_1 \cdot S_{\text{liquidity}} + w_2 \cdot S_{\text{drawdown}} + w_3 \cdot S_{\text{audit}} + w_4 \cdot S_{\text{oracle}}$$

Where:
- **$S_{\text{liquidity}}$ (Weight: 35%)**: Measures depth relative to Hikari's position. Ensures the protocol can exit 100% of its allocation with $<1\%$ slippage within 1 hour.
- **$S_{\text{drawdown}}$ (Weight: 30%)**: Historical NAV stability. Any 24-hour loss drops this sub-score exponentially.
- **$S_{\text{oracle}}$ (Weight: 20%)**: Price divergence between underlying strategy pricing and global median SDEX/Pyth oracles.
- **$S_{\text{audit}}$ (Weight: 15%)**: Formal verification status, OpenZeppelin/Certora audit reports, and time live on mainnet without security incidents.

---

## 3. Allocation Bands & Circuit Breakers

| Health Score Band | Status | Max Portfolio Weight | Protocol Action |
| ----------------- | ------ | -------------------- | --------------- |
| **85 – 100** | Prime Alpha | Up to 40% | Full autonomous keeper rebalancing enabled. |
| **70 – 84** | Standard Tier | Up to 20% | Normal operations with tighter slippage bounds. |
| **50 – 69** | Monitored | Up to 10% | No new deposits; harvest rewards only. |
| **< 50** | Degraded | 0% (Immediate Unwind) | Automated orderly exit to liquid XLM cash reserve. |

---

## 4. Dispute & Incident Playbook

If a strategy suffers an unexpected smart contract exploit, oracle flash crash, or bad debt accumulation:
1. **Automated Trip**: The Safety Sentinel pauses deposits to the affected strategy adapter within the same ledger block.
2. **Orderly Liquidation**: Keepers withdraw all unencumbered assets back to `hikari_core`.
3. **Insurance Absorption**: Any shortfall is absorbed by the Hikari Protocol Reserve Fund (50% of protocol performance fees) to ensure `hXLM` stakers maintain parity.
