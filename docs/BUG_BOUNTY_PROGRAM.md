# Hikari Protocol: Bug Bounty Program Specification (DRAFT — verify funding before publicizing)

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Platform**: Immunefi / Direct Security Disclosure  
**Program Status**: **Unverified — do not treat as active.** This file said "Active (Pre-Mainnet & Mainnet)" with a "$100,000 USDC" pool, but nothing in this repository shows that pool is actually escrowed/funded or that an Immunefi listing exists, and the landing page's own test suite (`scripts/verify_ui.js`) explicitly asserts that **no** "Bug Bounty" badge should appear on the site (`noBugBountyPill`) — i.e. this was apparently already pulled from public view once. Publishing "Active" with a specific dollar figure to real security researchers when the pool isn't confirmed funded would be a serious problem (people doing real work expecting real payment). **Maintainer: confirm real funding/escrow before flipping this back to "Active," or mark it "Planned" until then.**  

---

## 1. Overview & Objectives

Hikari Protocol values the crucial contributions of independent security researchers, ethical hackers, and Soroban smart contract developers. This Bug Bounty Program is designed to identify, report, and resolve vulnerabilities across our Soroban smart contracts, autonomous agent policy engine, and machine payment gateways.

---

## 2. Rewards Matrix

Bounties are paid in native `USDC` (SEP-41 SAC) or `XLM` based on the Immunefi Vulnerability Severity Classification System:

| Severity Tier | Maximum Reward | Minimum Reward | Primary Criteria |
|---|---|---|---|
| **Critical** | **\$50,000 USDC** | \$25,000 USDC | Direct theft of user funds, permanent freeze of vault reserves, unbounded share inflation exploit |
| **High** | **\$15,000 USDC** | \$7,500 USDC | Unauthorized strategy allocation, GateSeal bypass, permanent unbonding cooldown lock |
| **Medium** | **\$5,000 USDC** | \$2,000 USDC | Rebalance front-running, griefing attack causing unexpected gas drain, oracle desync without loss |
| **Low** | **\$1,000 USDC** | \$500 USDC | Contract logic bug with zero economic loss, minor event logging discrepancy |

---

## 3. Scope & Target Assets

### Smart Contracts (In-Scope):
- `contracts/vault/src/lib.rs` (Vault Core, share accounting)
- `contracts/token/src/lib.rs` (hXLM SEP-41 token)
- `contracts/withdrawal_queue/src/lib.rs` (Withdrawal Queue, cooldown logic)
- `contracts/gate_seal/src/lib.rs` (Emergency circuit breaker)
- `contracts/blend_adapter/src/lib.rs`, `contracts/phoenix_adapter/src/lib.rs`, `contracts/soroswap_adapter/src/lib.rs` (adapters — note: these currently run simulated self-accrual and don't call the real external protocols, see ARCHITECTURE.md §4.2)

### Infrastructure & Agents (In-Scope):
- `engine/src/policy_engine.ts`, `engine/src/policy_verifier.ts` (deterministic policy enforcement — corrected path, `engine/src/policy.ts` doesn't exist)
- `engine/src/cryptographic_verifier.ts` (Merkle state verification)
- `agents/src/payment_agent.ts` (x402 payment budget limits — part of the disconnected offline `agents/` prototype, see PROPOSAL.md §4.3)

---

## 4. Out-of-Scope Vulnerabilities

The following types of reports are excluded from bounty rewards:
- Attacks requiring physical access to hardware signers or user passkey devices.
- Social engineering, phishing, or DNS spoofing attacks on frontend domains.
- Vulnerabilities in third-party protocols outside of Hikari (e.g. core Soroban host bugs, native Blend / Phoenix contract exploits).
- Attacks involving flash loans that do not result in a loss of funds from Hikari contracts.
- Theoretical vulnerabilities without a reproducible proof-of-concept (PoC).

---

## 5. Submission & Responsible Disclosure Process

1. **Submission Email**: Submit reports directly to `ibochivincent-lang@users.noreply.github.com` with the subject tag `[SECURITY BUG BOUNTY]`.
2. **Report Requirements**:
   - Detailed description of the vulnerability.
   - Step-by-step reproduction instructions or a test case using the Soroban Rust test suite (`cargo test`) or TypeScript SDK (`@hikari/sdk`).
   - Assessment of severity and potential economic impact.
3. **Response Time**:
   - Initial acknowledgement: < 24 hours.
   - Triage and reproduction: < 48 hours.
   - Patch and bounty payout: < 7 days from verification.
4. **Coordinated Disclosure**: Researchers must maintain strict confidentiality until a fix has been verified and deployed on-chain.
