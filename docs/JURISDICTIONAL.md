# Hikari Protocol — Jurisdictional & Regulatory Memorandum

> **Decentralized Software Classification & Non-Custodial Architecture Memo**
> Records the technical and architectural basis for Hikari Protocol's regulatory posture.

---

## 1. Thesis: Non-Custodial Software Architecture

Financial intermediary, money services business (MSB), and virtual asset service provider (VASP) regulations typically attach to entities that take custody or discretionary control of customer funds. Hikari Protocol is designed so that it never takes custody:

1. **User-Signed Invocations**: Asset transfers occur solely when signed by the user's private key via non-custodial wallet software (Freighter, Lobstr, xBull).
2. **Autonomous Smart Contracts**: Assets are locked in open-source Soroban smart contracts (`hikari_core.wasm`). The developer team has no backdoor keys to seize user balances.
3. **Third-Party Anchor Fiat Settlement**: Fiat off-ramps (Direct to Bank) are executed by licensed, regulated Stellar anchors under SEP-24 and SEP-6. KYC, AML, and local bank wires are executed by the anchors.
4. **Information & Optimization Layer**: The off-chain keeper network acts as automated software executing public arbitrage and rebalancing logic.

---

## 2. Risk Register

| Regulatory Concern | Protocol Architecture Posture |
| ------------------ | ----------------------------- |
| **Money Transmission / MSB** | Strictly non-custodial; no held keys; decentralized smart contract execution. |
| **Asset Custody** | Funds held in immutable Soroban contract state, redeemable 1:1 against reserves. |
| **KYC / AML** | Performed by licensed financial anchors during fiat off-ramp stages. |
| **Securities Law Considerations** | `hXLM` is a liquid staking receipt token representing proportional programmatic claims on underlying protocol reserves. |

---

## 3. Related Documents

- [`docs/NON_CUSTODY.md`](NON_CUSTODY.md) — Architectural proof of non-custodial operation
- [`docs/SECURITY.md`](SECURITY.md) — Security policy and vulnerability disclosure
- [`docs/SEP_COMPLIANCE.md`](SEP_COMPLIANCE.md) — Compliance with Stellar standards
