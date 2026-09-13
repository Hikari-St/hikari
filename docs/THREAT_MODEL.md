# Hikari Protocol — Threat Model & Security Analysis

> **Threat Model, Attack Vectors, and Cryptographic Mitigations for Soroban Protocol 27**
> Scope: Soroban smart contracts, off-chain keepers, risk policy engine, database isolation, and MCP agent surface.

---

## 1. System Overview & Trust Boundaries

Hikari manages user capital across approved Soroban DeFi venues. The system decomposes into distinct trust boundaries:

1. **User Funds & Vault State (High Trust / Critical)**: Guarded by Soroban smart contracts (`hikari_core`). Asset transfers require explicit user signatures (`require_auth`) and satisfy mathematical share accounting.
2. **AI Agents & MCP Clients (Zero Trust / Untrusted)**: LLMs and automated heuristic agents are untrusted entities. They cannot hold signing keys to user vaults and cannot initiate fund transfers directly.
3. **Deterministic Policy Engine (Medium-High Trust)**: A deterministic verification boundary evaluating agent proposals against immutable boundaries before transaction construction.
4. **On-chain Policy Account (High Trust)**: Custom smart account enforcing per-transaction caps and destination allowlists on-chain.
5. **External Data Sources & Oracles (Low Trust)**: Prices, strategy APYs, and indexer state are treated as potentially malicious or stale.

---

## 2. Threat Vector Matrix

| Threat | Vector | Severity | Cryptographic & Architectural Mitigation |
| ------ | ------ | -------- | ---------------------------------------- |
| **First-Depositor Inflation Attack** | Attacker mints 1 share and donates large balance to dilute next depositor | High | Virtual share offset ($10^3$ virtual shares locked at deployment); standard ERC-4626 inflation defense. |
| **LLM Hallucination / Prompt Injection** | External market news prompts malicious agent to propose unvetted rebalance | High | LLMs emit strictly structured JSON proposals evaluated by deterministic `PolicyVerifier`; unverified contracts dropped instantly. |
| **Flash-Loan Sandwich Harvest** | Attacker deposits right before yield distribution and redeems immediately | Medium | FIFO Unbonding Queue with 1–3 day cooldown; continuous NAV compounding eliminates lumpy distribution windows. |
| **Soroban State Archival (TTL Expiration)** | Inactive user balances or strategy records are archived by ledger rent | High | Automated `extend_ttl` on every deposit, withdrawal, and keeper rebalance; separation into Instance and Persistent keys. |
| **Rogue Strategy Insolvency** | Underlying DeFi protocol (e.g. Blend/Phoenix) suffers exploit or bad debt | High | 40% maximum allocation cap per protocol; 15% mandatory liquid cash floor; automated Bunker Mode trips on >5% NAV drop. |
| **Intent Replay Attack** | Malicious node attempts to re-submit signed intent to double-stake | Medium | Intent hashes recorded permanently in on-chain replay registry; signed timestamps verified against current ledger. |
| **Cross-Session Address Mixup** | Concurrently connecting users receive cross-contaminated portfolio state | Medium | Multi-tenant database schema enforced by unique public key isolation; cryptographic nonces verified prior to session issuance. |
| **Denial of Service on APIs** | Heavy traffic floods `/api/vault` or simulation endpoints | Low | In-memory token bucket rate limiting (100 req/min per IP); static asset caching on edge CDN. |

---

## 3. Review Cadence & Audit Status

This threat model is reviewed prior to every minor release and verified against property-based invariant fuzzing suites (`scripts/run_fuzz_tests.js`). Third-party formal verification and external auditing are scheduled under Roadmap Wave 1.1.

---

## 4. Related Documents

- [`docs/SECURITY.md`](SECURITY.md) — Security policy and vulnerability reporting
- [`docs/NON_CUSTODY.md`](NON_CUSTODY.md) — Non-custodial architectural proof
- [`docs/INVARIANT_SPECIFICATION.md`](INVARIANT_SPECIFICATION.md) — Formal mathematical proofs
