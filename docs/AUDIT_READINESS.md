# Hikari Protocol: Smart Contract Audit Readiness Package

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Protocol Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)  
**Target Blockchain**: Stellar (Soroban Smart Contracts, Protocol 27)  
**Audit Target Firms**: Zellic, Trail of Bits, OtterSec, Certora  

---

## 1. Executive Summary & Architecture Scope

Hikari is an autonomous, non-custodial liquid-yield and agentic finance protocol natively deployed on Stellar Soroban. It pools user deposits, mints yield-bearing `hXLM` shares (SEP-41 compliant), and dynamically balances capital across approved DeFi strategies (Blend Protocol lending, Phoenix CLAMM, and Soroswap AMM) with deterministic on-chain policy constraints and atomic Soroban MEV backrun capture.

### Core Smart Contract Scope

> The function names below are copied directly from the current contract source (verified in this
> pass) — an earlier version of this table had invented names/paths that didn't exist
> (`adapter_blend/`, `contracts/gateseal/`, `get_apy`, `claim_batch`, `propose_policy`, etc.),
> which would have wasted an auditor's time. `withdraw`, share claiming, etc. actually live on
> the vault / withdrawal_queue contracts as shown.

| Contract Name | Rust Path | Description | Key Functions (real) |
|---|---|---|---|
| **Hikari Vault** | `contracts/vault/src/lib.rs` | Central capital pool, virtual share accounting | `deposit`, `withdraw`, `allocate_to_strategy`, `deallocate_from_strategy`, `emergency_exit_strategy`, `pause`/`unpause`, `total_assets`, `total_shares` |
| **Withdrawal Queue** | `contracts/withdrawal_queue/src/lib.rs` | Asynchronous cooldown-based redemption queue | see contract source — separate from the vault's own `withdraw` |
| **hXLM Share Token** | `contracts/token/src/lib.rs` | SEP-41 compliant fungible share token | `mint`, `burn`, `balance`, `transfer`, `transfer_from`, `approve`, `allowance` (no `clawback`) |
| **Strategy Registry** | `contracts/strategy_registry/src/lib.rs` | Whitelist registry with per-strategy caps | `add_strategy`, `update_cap`, `pause_strategy`, `unpause_strategy`, `revoke_strategy`, `get_strategy`, `get_all_strategies` |
| **Policy Account** | `contracts/policy_account/src/lib.rs` | Agent/contract allowlist + spend-limit smart account | `set_agent_status`, `set_contract_allowed`, `set_limits`, `verify_and_record_action`, `get_spending_status` |
| **GateSeal Circuit Breaker** | `contracts/gate_seal/src/lib.rs` | One-shot emergency panic button with 7-day auto-expiring pause | `seal`, `unseal`, `is_sealed`, `is_seal_expired`, `get_seal_status` |
| **Blend Adapter** | `contracts/blend_adapter/src/lib.rs` | Testnet-deployed, simulated self-accrual — does not call the real Blend protocol | `deposit`, `withdraw`, `total_value`, `harvest`, `emergency_exit`, `configured_rate_bps` |
| **Phoenix Adapter** | `contracts/phoenix_adapter/src/lib.rs` | Testnet-deployed, simulated self-accrual — does not call the real Phoenix protocol | `deposit`, `withdraw`, `total_value`, `accrue_fees`, `recenter_ticks`, `emergency_exit`, `configured_rate_bps` |

---

## 2. Invariants & Mathematical Guarantees

Auditors should formally verify the following invariants:

### Invariant 1: Virtual Share Anti-Inflation Protection
$$\text{Shares} = \frac{\text{Assets} \times (\text{TotalShares} + 1000)}{\text{TotalAssets} + 1}$$
- **Proof Goal**: For any arbitrary sequence of deposits, transfers, and direct asset donations, an attacker depositing $1\text{ stroop}$ cannot dilute subsequent depositors or cause share truncation to zero.

### Invariant 2: Conservation of Liquid Reserve Buffer
$$A_{\text{idle}} \ge \beta \cdot A_{\text{total}}, \quad \text{where } \beta \ge 0.15$$
- **Proof Goal**: At least 15% of total protocol capital remains liquid in the vault reserve buffer at all times to satisfy immediate Turbo Mode redemptions without forcing fire-sale liquidations.

### Invariant 3: High-Water Mark Non-Dilutive Fee Accrual
$$\Phi_{\text{perf}} = \gamma \cdot \max(0, \text{NAV}_t - \text{NAV}_{\text{HWM}}) \cdot A_{\text{total}}, \quad \gamma = 0.10$$
- **Proof Goal**: Performance fees are minted strictly when $\text{NAV}_t > \text{NAV}_{\text{HWM}}$. In drawdown cycles, no performance fees can be collected under any condition.

### Invariant 4: Monotonic Equity Preservation in Bunker Mode
$$\text{Haircut Bps} = \min\left(2500, \frac{\text{Drawdown Bps} \times 10000}{1500}\right)$$
- **Proof Goal**: During insolvency or sudden collateral impairment, all claimants receive equitable pro-rata payouts in FIFO order, mathematically eliminating the first-mover advantage of bank runs.

### Invariant 5: GateSeal Timelock & Expiration Boundary
$$\Delta_{\text{seal}} = 120,960 \text{ ledgers} \approx 7 \text{ days}$$
- **Proof Goal**: Once activated, the GateSeal can pause strategy allocations for at most 7 days, after which the contract automatically unseals without requiring human intervention.

---

## 3. Threat Vectors & Attack Surface

1. **First-Depositor Inflation**: Mitigated by virtual shares ($10^3$) and virtual assets ($1$).
2. **LLM Agent Prompt Injection / Hallucination**: AI agents hold zero signing keys; all proposals are validated against the deterministic on-chain Policy Account allowlist before execution.
3. **Flash-Harvest Sandwich Attacks**: Asynchronous withdrawal queue with minimum cooldown ledgers prevents deposit-harvest-withdraw sandwich attacks.
4. **Soroban State Archival**: Automatic TTL extension (`extend_ttl`) is invoked during all deposit, withdrawal, and rebalance operations.
5. **Oracle Latency & Malicious Spreads**: MEV backrunner requires atomic ledger close execution with zero net inventory risk.

---

## 4. Test Suites & Verification Reproduction

```bash
# 1. Rust Cargo Soroban Contract Tests (31 unit tests, verified in this pass)
cargo test --manifest-path contracts/Cargo.toml

# 2. Automated randomized invariant fuzzing (unseeded — exact counts vary per run)
node scripts/run_fuzz_tests.js --iterations=10000

# 3. Multi-Scenario Market Stress Test (365 Epochs)
npm run test:stress

# 4. Off-Chain Policy Engine & Cryptographic Proof Verification
npm run test:engine

# 5. Developer TypeScript SDK Verification
npm run test:sdk
```

---

## 5. Storage Key Layout & Soroban TTL

- `InstanceStorage`: Protocol state, paused flag, HWM NAV, and treasury address.
- `PersistentStorage`: User ticket balances, strategy allocation caps, and policy limits.
- `TemporaryStorage`: Ephemeral oracle quotes and rebalance proposal nonces.
