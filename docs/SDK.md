# Hikari Protocol — TypeScript SDK Reference (`@hikari/sdk`)

> **Client SDK for Staking, Wrapping, Unbonding & Invariant Telemetry on Stellar Soroban**
> Documentation for `@hikari/sdk`, generated against the real `sdk/src/client.ts` (verified in this pass — the previous version of this file described method names, signatures, a config shape, and an error-class hierarchy that don't exist in the actual code).

---

## 1. Installation

```bash
npm install @hikari/sdk @stellar/stellar-sdk
```

---

## 2. Quickstart

```typescript
import { HikariClient } from '@hikari/sdk';

// config is optional — Partial<SdkConfig>, merged over TESTNET_DEFAULT_CONFIG.
// Real fields are { network, rpcUrl, networkPassphrase, contracts } — not
// { horizonUrl, sorobanRpcUrl } as an earlier version of this doc claimed.
const client = new HikariClient({ network: 'testnet' });
```

---

## 3. Core Methods (real signatures)

Most of these are **pure, synchronous calculations** — they do not fetch anything themselves. You supply live on-chain values (e.g. from `GET /api/telemetry`), and the SDK does the math the same way the deployed vault contract does.

### `previewDeposit(assetsStroops: bigint, totalAssetsStroops: bigint, totalSharesStroops: bigint): bigint`
Shares minted for a deposit, applying the same virtual-share/virtual-asset offset as the Rust contract.
```typescript
const sharesOut = client.previewDeposit(100_0000000n, totalAssetsStroops, totalSharesStroops);
```

### `previewRedeem(sharesStroops: bigint, totalAssetsStroops: bigint, totalSharesStroops: bigint, haircutBps?: number): bigint`
Assets returned for redeeming shares, with an optional Bunker Mode haircut applied.

### `buildDepositTx(fromAddress: string, amountStroops: bigint)`
Returns a `{ contractId, functionName, args, network }` invocation payload — **not** a signed or unsigned XDR string. The live app builds a real signable XDR server-side via `POST /api/build-deposit` (see `frontend/server.js`); that's what Freighter actually signs.

### `buildRequestWithdrawalTx(userAddress: string, sharesStroops: bigint)`
Invocation payload for queuing an unbonding request. (Not `buildRequestWithdrawTx` — that name doesn't exist.)

### `buildClaimWithdrawalTx(userAddress: string, ticketId: bigint)` / `buildClaimBatchTx(userAddress: string, ticketIds: bigint[])`
Invocation payloads for claiming one or many matured tickets.

### `parseTicketStatus(ticket: { unlockLedger: number; claimed: boolean; cancelled: boolean }, currentLedger: number): "CLAIMED" | "CANCELLED" | "READY" | "IN_COOLDOWN"`
Returns a plain status string — not an object with `.isReady`/`.cooldownRemaining` fields.
```typescript
const status = client.parseTicketStatus({ unlockLedger, claimed, cancelled }, currentLedger);
```

### `calculateNav(totalAssetsStroops: bigint, totalSharesStroops: bigint): number`
NAV per share, virtual-offset adjusted.

### Async, RPC-backed methods
`getFactoryInfo()`, `getSentinelStatus()`, `getSocialTelemetry()`, `getLatestSolvencyProof()` — these do make live Soroban RPC calls via `ContractReader`. See `sdk/src/client.ts` for exact return shapes (`FactoryInfo`, `SentinelStatus`, etc. in `sdk/src/types.ts`).

### Governance
`buildVoteTx`, `buildStakerVetoTx`, `buildCreateProposalTx` — invocation payloads for the governance contract.

---

## 4. Error Handling

There is no custom error-class hierarchy (`InvariantViolationError`, `BunkerModeActiveError`, `SlippageExceededError` do not exist in this SDK — an earlier version of this doc invented them). Methods either return a value or, for the RPC-backed async methods, reject with whatever error the underlying `@stellar/stellar-sdk` RPC call throws. Handle failures with a plain `try/catch`.
