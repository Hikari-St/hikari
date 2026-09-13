# Hikari Protocol — Frequently Asked Questions (FAQ)

---

### Is Hikari Protocol custodial? Do you hold my funds?
No. Hikari is strictly non-custodial by code construction. You deposit assets directly into open-source Soroban smart contracts (`hikari_core.wasm`) deployed on Stellar Protocol 27. You sign every transaction from your own non-custodial wallet (Freighter, Lobstr, xBull). Hikari never has custody or access to your private keys. See [`docs/NON_CUSTODY.md`](NON_CUSTODY.md).

---

### What is the difference between hXLM and whXLM?
- **`hXLM`**: The core yield-bearing liquid staking receipt token. Its Net Asset Value (NAV) increases relative to XLM over time as yields compound. 1 hXLM becomes worth more than 1 XLM.
- **`whXLM` (Wrapped hXLM)**: A non-rebasing, ERC-4626 style wrapper that maintains a constant nominal balance. It is designed specifically for external lending markets (like Blend) and AMMs that require static balance tokens.

---

### Where does the yield come from?
Hikari aggregates yield from three audited decentralized sources on Stellar:
1. **Blend Money Markets**: Interest paid by decentralized borrowers borrowing XLM against over-collateralized assets.
2. **Phoenix CLAMM**: Trading fees earned by supplying concentrated liquidity in narrow, dynamically rebalanced tick ranges.
3. **Atomic MEV Arbitrage Backrunning**: Zero-risk arbitrage captured between SDEX orderbooks and Soroban AMMs, recycled 100% into staker NAV.

---

### How do withdrawals work?
Hikari provides two withdrawal paths in the DApp:
1. **Unbonding Queue (Recommended)**: 0% protocol fee. Your shares enter an orderly FIFO unbonding queue that settles against underlying strategy reserves in ~1 to 3 days. Once mature, you claim your full principal + accrued yield.
2. **Instant DEX Swap**: Takes ~10 seconds. Sells your `hXLM` for native `XLM` immediately via Soroswap / Phoenix CLAMM pools with standard market slippage.

---

### How does "Direct to Bank" fiat off-ramp work?
Direct to Bank connects Hikari to Stellar's licensed anchor rails (SEP-24 and SEP-6). Hikari liquidates your `hXLM` into your chosen fiat currency (USD, EUR, NGN, GBP, BRL) and the anchor transmits the payment directly into your commercial bank account via local wire within 2 to 5 minutes.

---

### What fees does Hikari charge?
- **Deposit Fee**: 0% (Free).
- **Queue Withdrawal Fee**: 0% (Free).
- **Performance Fee**: 5% on generated yield only (never on principal). 50% funds keeper gas and autonomous telemetry; 50% strengthens the protocol insurance reserve.
- **Network Gas**: Standard Stellar ledger fee (~0.00001 XLM).

---

### What happens during market crashes or extreme volatility?
Hikari features an autonomous Safety Sentinel:
- A mandatory **15% liquid cash reserve floor** is kept in native XLM at all times.
- If an underlying strategy experiences an abnormal drawdown (>5%), **Bunker Mode** triggers automatically: deposits pause, strategy allocations unwind to cash, and unbonding proceeds pro-rata from verified reserves.

---

### Can AI agents interact with Hikari?
Yes! Hikari is built natively for AI agents:
- **Model Context Protocol (MCP)**: Exposes 5 tools for AI models to query yields and prepare staking transactions.
- **x402 Micropayments**: Facilitates autonomous sub-cent payments on Stellar without human wallet popups.
- Agents cannot transfer funds without user-signed authorization. See [`docs/MCP.md`](MCP.md).

---

### Is there an SDK?
Yes. `@hikari/sdk` is a TypeScript library that handles NAV calculations, deposit builders, and unbonding status checks. See [`docs/SDK.md`](SDK.md) and [`docs/COOKBOOK.md`](COOKBOOK.md).
