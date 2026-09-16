# Hikari Protocol: External Smart Contract Audit Dossier

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Target Auditors**: Zellic, Trail of Bits, OtterSec  
**Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)  
**Language / Platform**: Rust (Soroban SDK v21+) / Stellar Network (Protocol 27)  
**Audit Scope**: Vault Core, Share Accounting, GateSeal Circuit Breaker, Withdrawal Queue, Strategy Registry, Strategy Adapters, Policy Account  

---

## 1. System Architecture & Contract Scope Matrix

| Contract Name | Source Path | Target Runtime | Approx. LOC | Core Mathematical / Security Responsibilities |
| :--- | :--- | :---: | :---: | :--- |
| **Dynamic Vault Core** | `contracts/vault/src/lib.rs` | Soroban WASM | ~350 | ERC-4626 share minting/burning, virtual shares ($10^3$), virtual assets ($1$), 15% reserve floor |
| **Share Token (`hXLM`)** | `contracts/token/src/lib.rs` | Soroban WASM | ~220 | SEP-41 compliant liquid yield-bearing token, non-dilutive balance tracking |
| **Withdrawal Queue** | `contracts/withdrawal_queue/src/lib.rs` | Soroban WASM | ~280 | Asynchronous redemption queue, 50-ledger cooldown, monotonic FIFO payouts |
| **GateSeal Breaker** | `contracts/gate_seal/src/lib.rs` | Soroban WASM | ~180 | One-shot emergency panic freeze ($\le 120,960$ ledgers / ~7 days), automatic self-unseal |
| **Factory & Registry** | `contracts/strategy_registry/src/lib.rs`| Soroban WASM | ~210 | Versioned WASM registry, allocation caps, strategy allowlist enforcement |
| **Blend Adapter** | `contracts/blend_adapter/src/lib.rs` | Soroban WASM | ~160 | SEP-41 collateral supply into Blend money markets, interest receipt custody |
| **Phoenix CLAMM Adapter**| `contracts/phoenix_adapter/src/lib.rs` | Soroban WASM | ~175 | Concentrated liquidity LP management, fee harvesting, 50 bps slippage bounds |
| **Policy Account** | `contracts/policy_account/src/lib.rs` | Soroban WASM | ~190 | 3-of-5 threshold multisig custom smart account, deterministic policy validation |

---

## 2. Mathematical Invariant Proofs (Auditor Verification)

### Invariant 1: Virtual Share Anti-Inflation Immunity
$$\text{Shares Minted} = \frac{\text{Assets} \times (\text{TotalShares} + 1000)}{\text{TotalAssets} + 1}$$
- **Threat Mitigated**: The classic ERC-4626 first-depositor inflation exploit where an attacker deposits $1\text{ stroop}$, donates $100,000\text{ XLM}$ directly to the contract, and rounds down subsequent depositors' shares to 0.
- **Proof**: With $1{,}000$ virtual shares and $1$ virtual asset offset, any donation $D$ results in $\text{Shares} \ge 1$ for any legitimate user deposit $A \ge 1\text{ XLM}$.
- **Verification Harness**: Run `node scripts/run_fuzz_tests.js`. 10,000 randomized donation scenarios confirm **0 zero-share exploits**.

### Invariant 2: Dynamic Liquid Reserve Floor Conservation
$$A_{\text{idle}} \ge 0.15 \cdot A_{\text{total}}$$
- **Property**: At least 15% of all vault assets remain in unencumbered native SAC tokens. Redemptions below this buffer settle instantly without touching external strategy positions.
- **Proof**: Rebalance operations assert $A_{\text{allocated}} \le 0.85 \cdot A_{\text{total}}$. Any allocation violating this threshold reverts atomically.

### Invariant 3: High-Water Mark (HWM) Performance Fee Accrual
$$\Phi_{\text{perf}} = \max\left(0,\; 0.10 \cdot (\text{NAV}_t - \text{NAV}_{\text{HWM}}) \cdot A_{\text{total}}\right)$$
- **Property**: Performance fees are strictly calculated on net profit above the historical high-water mark. Under drawdowns, fee accrual is mathematically $0$.
- **Verification Harness**: In 10,000 fuzz cycles with randomly generated drawdowns, exactly $0$ performance fees were collected below HWM.

### Invariant 4: Bunker Mode Pro-Rata Equity & Bank-Run Defense
$$A_{\text{claimable}} = S_{\text{redeemed}} \times \text{NAV} \times \left(1 - \frac{\text{Haircut Bps}}{10,000}\right)$$
$$\text{Haircut Bps} = \min\left(2500, \frac{\text{Drawdown Bps} \times 10000}{1500}\right)$$
- **Property**: When drawdown exceeds 15%, the vault enters Bunker Mode. Redemptions switch from instant to a FIFO queue with a shared loss haircut, eliminating the first-mover advantage of bank runs.
- **Verification Harness**: `node scripts/run_fuzz_tests.js` is unseeded, so the count of bunker-scenario iterations that actually trigger a drawdown varies run to run (observed ~5,700–5,750 out of 10,000 across a couple of local runs) — treat any single number here as illustrative, not a fixed constant, and re-run to reproduce.

### Invariant 5: GateSeal Circuit Breaker Bounds
$$\Delta_{\text{seal}} \le 120,960\text{ ledgers} \approx 7\text{ days}$$
- **Property**: The GateSeal account has strictly bounded pause authority. It can only freeze new allocations to strategies; it cannot freeze redemptions or drain user funds, and automatically unseals after the timelock expires without human intervention.

---

## 3. Formal 10,000-Iteration Fuzzing Results

This is real, reproducible output — `node scripts/run_fuzz_tests.js --iterations=10000` reimplements
the vault's share/NAV/haircut math in plain JS and property-checks it under randomized inputs. It
is unseeded, so exact counts (especially "Bunker Haircuts Verified") vary run to run. One actual
run produced:

```
================================================================================
📊 10,000-ITERATION FORMAL INVARIANT FUZZING RESULTS:
================================================================================
  Total Iterations Executed:       10,000
  Inflation Attacks Tested:        10,000 (0 zero-share exploits)
  HWM Scenarios Evaluated:         10,000 (0 fees collected in drawdowns)
  Bunker Haircuts Verified:        5,749 (100% solvency preserved)
  15% Reserve Floor Enforced:      10,000 checks (0 floor breaches)
  Dual-Governance Vetoes Tested:   10,000 (100% malicious executions blocked)
  Total Invariant Violations:      0
================================================================================
🎉 ALL 6 CORE INVARIANTS FORMALLY VALIDATED ACROSS 10,000 RANDOM STATE TRANSITIONS!
```

Note this fuzzes a JS reimplementation of the invariant math, not the compiled Rust contract
bytecode directly — the Rust unit tests (`cargo test --manifest-path contracts/Cargo.toml`) are
the ones exercising the actual deployed code.

---

## 4. Threat Model & Out-of-Scope Items

### In-Scope Attack Vectors:
1. **Reentrancy**: Mitigated by Soroban's native non-reentrant host environment and isolated adapter traits.
2. **Rounding Errors**: Mitigated by 128-bit integer math and virtual share offsets.
3. **Storage TTL Expiration**: Automatic `extend_ttl` invoked across instance and persistent keys during deposits and rebalances.
4. **Access Control**: Role-based enforcement (Sentinel, Rebalance Officer, Treasury) gated by the 3-of-5 `PolicyAccount` multisig.
5. **Oracle Latency & Manipulation**: Bounded slippage (50 bps) and MEV atomic batch settlement.

### Out-of-Scope Items:
1. Stellar Core validator consensus failures (handled by Stellar SCP).
2. Bugs within third-party external money markets — moot today since the Blend/Phoenix/Soroswap adapters don't call those protocols yet (simulated self-accrual, see ARCHITECTURE.md §4.2). Each adapter does have a `capStroops` cap set at deployment (see `deployed_contracts.json`), but there is no general enforced "25% single-strategy" invariant in the contract code — do not cite one.

---

## 5. Auditor Reproduction Commands

Auditors can reproduce all test suites using the following commands:

```bash
# 1. Run 10,000-Iteration Property-Based Invariant Fuzzing Harness
node scripts/run_fuzz_tests.js

# 2. Run 365-Day 5-Regime scenario stress-test (NOT real historical market data — each
#    regime uses assumed constant daily returns/shock magnitudes; see BACKTEST_REPORT.md)
node scripts/run_backtest.js

# 3. Run Policy & Risk Engine Verification Tests
npm run test:engine

# 4. Run Developer TypeScript SDK Tests
npm run test:sdk

# 5. Run Full Hakiru Architecture & Social Bot Test Suite
npm run test:hakiru
```
