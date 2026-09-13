# Hikari Protocol — Non-Custody Manifesto

> **Architectural Proof of Non-Custodial Operation on Stellar Soroban**
> Proves that user private keys, assets, and redemption flows are structurally non-custodial by code construction.

---

## 1. What Hikari Never Holds

- **User Private Keys**: Signing occurs exclusively in client-side wallets (Freighter, Lobstr, xBull). The web app, SDK, and server never receive or store private keys.
- **Custodial Escrows**: Assets are deposited directly into open-source Soroban smart contracts (`hikari_core.wasm`). There is no centralized treasury wallet or intermediary holding user funds.
- **Unilateral Seizure Authority**: The protocol contracts contain no admin functions capable of freezing individual user balances or transferring assets to arbitrary recipient addresses.
- **User Personal Data / KYC**: We collect zero personal identifying information (PII). Users connect pseudo-anonymously using public Stellar account addresses (`G...`). Direct-to-bank fiat off-ramps route KYC through licensed Stellar anchors via SEP-24.

---

## 2. How the Non-Custodial Boundary is Enforced

1. **Explicit Authentication (`require_auth`)**: Every Soroban contract invocation that moves assets requires the explicit cryptographic signature of the asset owner.
2. **Autonomous Receipt Minting**: When XLM is deposited, `hXLM` is minted directly to the caller's address in the same atomic ledger transaction.
3. **Guaranteed Unbonding Rights**: Any holder of `hXLM` can burn their shares on-chain to receive a proportional share of underlying reserves. No operator permission is required.
4. **Agent Bounds**: AI agents operating via the Model Context Protocol (MCP) or x402 cannot execute transfers without user-signed intents or pre-authorized micro-allowances.

---

## 3. Related Documents

- [`docs/SECURITY.md`](SECURITY.md) — Security policy and vulnerability reporting
- [`docs/INTENT_API.md`](INTENT_API.md) — Non-custodial intent envelope specification
- [`docs/JURISDICTIONAL.md`](JURISDICTIONAL.md) — Regulatory analysis & software classification
