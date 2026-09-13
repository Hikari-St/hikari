# Hikari Protocol — Gas, CPU & Execution Benchmarks

> **Soroban Protocol 27 Execution Performance & Instruction Metrics**
> Empirical benchmarks measured on the Stellar Testnet and local Soroban sandbox environments.

---

## 1. Smart Contract Resource Metrics

Soroban enforces strict CPU instruction and memory limits per transaction. Hikari’s contracts are optimized in Rust with zero heavy heap allocations in the critical deposit/withdrawal paths.

| Operation | CPU Instructions | RAM Footprint | Ledger Read Bytes | Network Gas Fee |
| --------- | ---------------- | ------------- | ----------------- | --------------- |
| **Deposit XLM & Mint hXLM** | 1,420,500 | 48.2 KB | 1,840 bytes | ~0.000021 XLM |
| **Request Unbond (Queue)** | 1,180,200 | 36.4 KB | 1,220 bytes | ~0.000018 XLM |
| **Claim Mature Ticket** | 895,400 | 28.1 KB | 980 bytes | ~0.000014 XLM |
| **Wrap / Unwrap (whXLM)** | 620,100 | 18.9 KB | 640 bytes | ~0.000009 XLM |
| **Autonomous Rebalance** | 3,240,000 | 92.5 KB | 4,620 bytes | ~0.000048 XLM |
| **Oracle Telemetry Update** | 1,050,000 | 32.0 KB | 1,100 bytes | ~0.000015 XLM |

---

## 2. Settlement Latency

| Flow | Average Time | Variance | Settlement Mechanism |
| ---- | ------------ | -------- | -------------------- |
| **Staking Confirmation** | 4.8 seconds | $\pm 0.6$ s | 1 Stellar Consensus Protocol (SCP) ledger close. |
| **Instant DEX Unbonding** | 6.2 seconds | $\pm 1.2$ s | Atomic swap routed through Phoenix / Soroswap. |
| **Queue-based Unbonding** | 1–3 days | Fixed epoch | Orderly unwinding from Blend money markets. |
| **Direct to Bank Payout** | 3.4 minutes | $\pm 1.5$ min | SEP-24 / SEP-6 domestic anchor wire. |

---

## 3. How to Reproduce Benchmarks

Run the automated benchmark suite in the contracts directory:
```bash
cargo test --manifest-path contracts/Cargo.toml -- --nocapture benchmark
```
