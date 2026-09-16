# Hikari Protocol — Stellar Ecosystem Proposals (SEP) Compliance Matrix

> **Corrected in this pass.** The previous version of this file marked SEP-24, SEP-6, SEP-38, and
> SEP-1 as "✅ Full Compliance" / "✅ Published" — direct-to-bank fiat off-ramps (USD/EUR/NGN/GBP/BRL
> "via licensed anchors" settling "within 2–5 minutes") and a published `stellar.toml`. None of
> that exists: there is no anchor integration, no `TRANSFER_SERVER`/`TRANSFER_SERVER_SEP0006`
> config anywhere in the codebase, and `frontend/public/.well-known/` doesn't exist at all. Real
> off-ramp/anchor integration is a licensing-and-partnership-heavy undertaking, not something to
> claim as shipped without it actually existing.

## 1. Implemented Stellar Standards

| Standard | Name | Implementation Scope | Status | Code Location |
| -------- | ---- | -------------------- | ------ | ------------- |
| **SEP-41** | Token Interface for Soroban | `hXLM` receipt token (balance, transfer, approve, mint, burn) | ✅ Implemented | `contracts/token/src/lib.rs` |
| **SEP-10** | Stellar Web Authentication | Challenge/nonce-based wallet session auth — real code, but self-described as "SEP-10 compliant *design*," not verified against the full SEP-10 spec (which requires a specific Stellar transaction-envelope challenge format) | ⚠️ Partial — verify against spec before claiming full compliance | `services/database/src/auth-service.ts` |
| **SEP-24** | Interactive Anchor Deposit/Withdraw | Not implemented — no anchor integration exists | ❌ Not implemented | — |
| **SEP-6** | Programmatic Anchor Transfer | Not implemented | ❌ Not implemented | — |
| **SEP-38** | Anchor RFQ Quotes | Not implemented | ❌ Not implemented | — |
| **SEP-1** | `stellar.toml` Metadata | Not published — no `.well-known/stellar.toml` file exists in this repo | ❌ Not implemented | — |

---

## 2. SEP-41 Token Standard Details

`hXLM` implements the Soroban token interface (verified against `contracts/token/src/lib.rs` in this pass):
- `balance(id: Address) -> i128`
- `transfer(from: Address, to: Address, amount: i128)`
- `transfer_from(spender: Address, from: Address, to: Address, amount: i128)`
- `approve(from: Address, spender: Address, amount: i128, live_until_ledger: u32)`
- `allowance(from: Address, spender: Address) -> i128`
- `mint(to: Address, amount: i128)` / `burn(from: Address, amount: i128)`

(No `spendable_balance` function exists — remove that from any integration code that assumed it.)

### Stellar Asset Contract (SAC) Interoperability
Native XLM is wrapped via Soroban's built-in SAC bridge (`underlyingNativeXlmSac` in `deployed_contracts.json`) — this part is real and deployed.

---

## 3. SEP-24 / SEP-6 Direct-to-Bank Integration — roadmap item, not built

If this ships in the future, it would require a real licensed anchor partnership, a `stellar.toml` with `TRANSFER_SERVER_SEP0024`/`TRANSFER_SERVER`, and SEP-38 quote integration — none of which exist today. Any UI copy describing "2–5 minute" bank payouts describes an unbuilt feature and should be labeled as such, not as a shipped capability.
