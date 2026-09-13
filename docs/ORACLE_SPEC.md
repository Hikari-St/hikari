# Hikari Protocol — Yield & NAV Oracle Specification

> **On-Chain Soroban Oracle Contract Specification for Protocol 27**
> Details the decentralized pricing and yield oracle that allows third-party dApps, lending markets, and automated bots to consume verifiable `hXLM` NAV, APR, and solvency telemetry.

---

## 1. Overview

The Hikari Yield & NAV Oracle is a Soroban smart contract deployed on Stellar that records:
1. Current Net Asset Value (NAV) per `hXLM` share.
2. Verified strategy APYs across Blend, Phoenix CLAMM, and Soroswap.
3. Total Value Locked (TVL) and liquid reserve ratio.
4. Circuit breaker (Bunker Mode / GateSeal) status.

This oracle provides a public, manipulation-resistant source of truth that other Stellar protocols (like Blend Money Markets for collateral valuation) can read without trusting centralized off-chain servers.

---

## 2. Soroban Contract Interface

### 2.1 Read Entrypoints

```rust
pub trait HikariOracleTrait {
    /// Returns the current NAV per hXLM share in stroops (1 XLM = 10,000,000 stroops).
    fn get_hxlm_nav(env: Env) -> i128;

    /// Returns the weighted average annual percentage yield (in basis points, e.g. 1240 = 12.40%).
    fn get_average_apr(env: Env) -> u32;

    /// Returns total active liquidity deployed across all strategies in stroops.
    fn get_total_reserves(env: Env) -> i128;

    /// Returns the liquid native XLM reserve ratio (in basis points, e.g. 1500 = 15.00%).
    fn get_liquid_reserve_ratio(env: Env) -> u32;

    /// Returns true if Bunker Mode or an emergency pause is active.
    fn is_bunker_active(env: Env) -> bool;
}
```

### 2.2 Publisher Entrypoints (Restricted)

```rust
pub fn update_telemetry(
    env: Env,
    caller: Address,
    nav_stroops: i128,
    apr_bps: u32,
    total_reserves: i128,
    proof_hash: BytesN<32>
) -> Result<(), OracleError>;
```

---

## 3. Anti-Manipulation Safeguards

To prevent flash-loan oracle skewing or manipulated pricing:
1. **Time-Weighted Median (TWM)**: NAV is calculated over a rolling 12-hour window. Spikes exceeding 1% in a single ledger are clamped.
2. **Strict Invariant Verification**: The contract asserts $R_{\text{reported}} \ge S_{\text{total}} \times \text{NAV}$ before accepting any update.
3. **Multi-Signer Guardian Quorum**: Oracle publisher keys are governed by a 2-of-3 multi-signer threshold.

---

## 4. Consuming the Oracle in Third-Party Contracts

Any external Soroban contract (e.g. Blend lending pool evaluating `hXLM` as collateral) can consume the oracle in Rust:

```rust
use soroban_sdk::{Env, Address};

pub fn evaluate_collateral(env: &Env, oracle_address: &Address, hxlm_shares: i128) -> i128 {
    let client = HikariOracleClient::new(env, oracle_address);
    let nav = client.get_hxlm_nav();
    (hxlm_shares * nav) / 10_000_000
}
```
