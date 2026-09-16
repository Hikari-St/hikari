# Hikari Protocol: Transparency Report

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`
**Network**: Stellar Testnet (Protocol 27 • Soroban)

> This file previously contained a fabricated "Monthly Transparency & Financial Audit Report"
> with invented figures (124,500 XLM TVL, fake fee accrual, "18 unit tests / 10,000 fuzz
> iterations / 365-day stress tests" that don't exist, and a false "Verified cryptographically"
> footer). Nothing in this repository generates a signed or cryptographically verified report on
> any schedule. What follows instead is a pointer to the real, live-queryable numbers.

---

## Where to get real numbers

There is no automated report generator or "Autonomous Risk Daemon" in this codebase. Instead, query the running app directly:

| Metric | Real source |
|---|---|
| Total Value Locked | `GET /api/telemetry` → `vaultState.totalAssetsStroops` (live Soroban read of `total_assets()`) |
| Net Asset Value (hXLM/XLM) | `GET /api/telemetry` → `oracleTelemetry.navStroops` — a keeper-fed oracle value, not yet derived from live Blend/Phoenix trading activity |
| Liquid reserve ratio | `GET /api/telemetry` → `oracleTelemetry.liquidReserveRatioBps` |
| GateSeal / circuit breaker status | `GET /api/telemetry` → `circuitBreaker` |
| Per-adapter TVL and configured rate | `GET /api/yield-routes` — includes a `disclosure` field explaining that Blend/Phoenix/Soroswap adapters run simulated self-accrual, not live third-party yield |
| Proof of reserves | `GET /api/v1/solvency/proof` — real SHA-256 Merkle root computed from on-chain reserves and the current Horizon ledger. There is currently **no real per-depositor liability registry**, so `depositorRegistryStatus` reports `EMPTY_NOT_YET_TRACKED` and no reserve ratio is claimed until one exists. |

## Test coverage (real, as of this repo)

31 Rust contract tests across the 15 Soroban contracts, plus a handful of TypeScript SDK/engine tests. There is no fuzz-testing or long-duration stress-test harness in this repository.

## Fee accrual

The `fee_controller` contract defines management/performance fee parameters (see `docs/ECONOMIC_MODEL.md`), but there is no tracked historical ledger of fees actually accrued — reporting a specific XLM figure for "fees accrued to date" would be fabricated, so none is given here.
