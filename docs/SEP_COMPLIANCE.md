# Hikari Protocol — Stellar Ecosystem Proposals (SEP) Compliance Matrix

> **Compliance Matrix and Technical Implementations of Stellar Standards on Protocol 27**
> Details how Hikari aligns with token specifications, web authentication, anchor rails, and Soroban interop.

---

## 1. Implemented Stellar Standards

| Standard | Name | Implementation Scope | Status | Code Location |
| -------- | ---- | -------------------- | ------ | ------------- |
| **SEP-41** | Token Interface for Soroban | Standardized token interface for `hXLM` receipt tokens (balance, transfer, approve, mint, burn). | ✅ Full Compliance | `contracts/hikari_core/` |
| **SEP-10** | Stellar Web Authentication | Cryptographic Ed25519 challenge-sign-verify for dApp sessions. | ✅ Full Compliance | `frontend/server.js`, `sdk/` |
| **SEP-24** | Interactive Anchor Deposit/Withdraw | Direct to Bank fiat off-ramps (USD, EUR, NGN, GBP, BRL) via licensed anchors. | ✅ Full Compliance | `frontend/public/app.html` |
| **SEP-6** | Programmatic Anchor Transfer | API-based automated liquidation and bank payout status polling. | ✅ Full Compliance | `frontend/public/app.js` |
| **SEP-38** | Anchor RFQ Quotes | Real-time FX exchange rate quotes for off-ramp calculations. | ✅ Integrated | `frontend/public/app.js` |
| **SEP-1** | `stellar.toml` Metadata | Discovery of protocol endpoints, contract addresses, and token issuers. | ✅ Published | `frontend/public/.well-known/` |

---

## 2. SEP-41 Token Standard Details

`hXLM` adheres strictly to the Soroban token standard (SEP-41), making it directly composable with all Stellar smart contracts:
- `balance(id: Address) -> i128`
- `spendable_balance(id: Address) -> i128`
- `transfer(from: Address, to: Address, amount: i128)`
- `approve(from: Address, spender: Address, amount: i128, live_until_ledger: u32)`
- `burn(from: Address, amount: i128)`

### Stellar Asset Contract (SAC) Interoperability
Through Soroban's built-in Stellar Asset Contract bridge, native XLM is wrapped into contract space without custodial risk and unbonded back to classic Stellar accounts seamlessly.

---

## 3. SEP-24 / SEP-6 Direct-to-Bank Integration

Hikari's Withdrawals tab integrates Stellar's anchor rails to allow stakers to exit directly into domestic bank accounts:
1. User requests bank payout of `hXLM` in USD, EUR, NGN, GBP, or BRL.
2. Hikari liquidates `hXLM` to native XLM / USDC via DEX swap.
3. Anchor executes SEP-24 / SEP-6 payout via domestic ACH, SEPA, or NIBSS wire within 2–5 minutes.
