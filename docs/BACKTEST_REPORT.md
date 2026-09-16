# Hikari Protocol: 365-Day Multi-Regime Scenario Stress-Test

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Last Updated**: September 2026  
**Status**: Deterministic scenario stress-test — not a historical backtest  

> **Correction**: this file was previously titled "365-Day Multi-Regime Backtesting & Risk Report"
> and framed as if Hikari had validated its policy engine against real historical market data.
> `scripts/run_backtest.js` does not use any historical price/TVL data — every regime (the bull
> run, the -22% shock, the recovery) uses **assumed constant daily return and shock parameters
> chosen by the author**, not measurements. It's a genuine, reproducible stress-test of the
> fee/haircut/GateSeal math under hypothetical adverse scenarios — a legitimate engineering
> exercise — but "backtest" overstated what it is. Reproduce with `node scripts/run_backtest.js`.

## 1. Methodology & Objectives

To stress-test the stability of the deterministic policy engine, virtual share accounting, and emergency GateSeal mechanisms under hypothetical adverse conditions, this script runs a continuous 365-day, 5-regime simulation with assumed (not measured) return/shock parameters per regime. The objective was to confirm:
1. **Solvency Preservation**: Zero bank runs or contract insolvency during severe drawdown shocks.
2. **High-Water Mark Discipline**: Performance fees accrued strictly when $\text{NAV}_t > \text{NAV}_{\text{HWM}}$.
3. **Queue Fairness**: Pro-rata haircuts in Bunker Mode prevent fast movers from draining vault reserves.

---

## 2. Tested Market Regimes

```
[Day 1-90: Bull Expansion] ──► [Day 91-180: Sideways Range] ──► [Day 181-220: Black-Swan Shock (-22%)]
                                                                               │
                                                                               ▼ (GateSeal Triggers)
[Day 271-365: Full Recovery] ◄── [Day 221-270: Stale Oracle Fallback] ◄── [Bunker Mode FIFO Queue]
```

### Regime Summary Table

| Regime | Days | Market Conditions | Protocol Reaction | Ending NAV | Solvency |
|---|---|---|---|---|---|
| **1. Bull Expansion** | 90 | Rising collateral, heavy lending demand | Rebalances capital into Blend & Soroswap pools | **1.0212** | 100% |
| **2. Sideways Range** | 90 | Low volatility, steady DEX volume | Captures Phoenix CLAMM fees & MEV spreads | **1.0377** | 100% |
| **3. Black-Swan Shock** | 40 | Severe collateral crash (-22% market shock) | GateSeal pauses allocations, Bunker Mode queue active | **0.8665** | 100% |
| **4. Stale Oracle** | 50 | High oracle latency, degraded paid feeds | Reverts to free public Horizon oracle fallback | **0.8722** | 100% |
| **5. Full Recovery** | 95 | Market rebounds, volatility normalizes | GateSeal auto-unseals, Turbo Mode resumes | **0.8987** | 100% |

---

## 3. Key Findings

1. **Virtual Share Defense**: Zero share dilution or donation exploits occurred across any epoch.
2. **Circuit Breaker Efficacy**: GateSeal paused the vault within a single ledger when drawdown crossed 15%, preventing cascading liquidations.
3. **High-Water Mark Protection**: During the 40 days of Bunker Mode and drawdown recovery, precisely 0 XLM in performance fees was deducted from stakers.
4. **MEV Staker Boost**: An aggregate of $+12,925\text{ XLM}$ was captured by atomic MEV backrunning and credited directly to vault depositors.
5. **Net NAV outcome (previously not disclosed here)**: under this scenario's assumed shock, ending NAV is **0.8987**, below the starting **1.0000** — i.e. this run models a staker holding through all 5 regimes ending with **~10% less value than they started with**, not a gain. "No bank run" and "100% solvency" (no insolvency event) are true, but should not be read as "no losses" — the script's own summary line even prints a malformed `+-10.13%` for what is actually a loss.
