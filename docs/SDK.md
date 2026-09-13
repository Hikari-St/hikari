# Hikari Protocol — TypeScript SDK Reference (`@hikari/sdk`)

> **Client SDK for Staking, Wrapping, Unbonding & Invariant Telemetry on Stellar Soroban**
> Complete documentation for `@hikari/sdk` implemented in `sdk/src/client.ts`.

---

## 1. Installation

```bash
npm install @hikari/sdk @stellar/stellar-sdk
```

---

## 2. Quickstart

```typescript
import { HikariClient } from '@hikari/sdk';

// Initialize with Stellar Testnet defaults
const client = new HikariClient({
  network: 'testnet',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org'
});
```

---

## 3. Core Methods

### `previewDeposit(amount: string): Promise<DepositQuote>`
Calculates expected `hXLM` shares based on current NAV, accounting for the virtual share offset.
```typescript
const quote = await client.previewDeposit('100');
console.log(quote.sharesOut); // e.g. "98.24"
```

### `buildDepositTx(params: DepositParams): Promise<string>`
Constructs an unsigned Soroban transaction for staking native XLM.
```typescript
const txXdr = await client.buildDepositTx({
  amount: '100',
  recipient: 'GB7T3PZCHBOMWGJRKZZWWNSUKQLHGOHY7L443QG5P'
});
```

### `previewRedeem(shares: string): Promise<RedeemQuote>`
Calculates native XLM returned when burning `hXLM`, evaluating whether Bunker Mode or the standard unbonding rate applies.

### `buildRequestWithdrawTx(params: WithdrawParams): Promise<string>`
Constructs an unbonding queue entry transaction that burns `hXLM` and generates a claim ticket.

### `parseTicketStatus(ticket: UnbondingTicket): TicketStatus`
Evaluates whether a ticket is still in cooldown or ready for redemption claim.
```typescript
const status = client.parseTicketStatus(ticket);
console.log(status.isReady); // true or false
console.log(status.cooldownRemaining); // e.g. "18 hours"
```

---

## 4. Error Handling

The SDK exports canonical typed errors:
- `InvariantViolationError`: Thrown if requested deposit/redemption would breach the 15% reserve floor.
- `BunkerModeActiveError`: Thrown if attempting a strategy rebalance while emergency pause is triggered.
- `SlippageExceededError`: Thrown if DEX swap returns fewer assets than `minAssetsOut`.
