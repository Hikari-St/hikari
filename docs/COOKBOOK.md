# Hikari Protocol — Developer Cookbook

> **End-to-End Code Recipes and Integration Snippets**
> Practical implementation patterns for wallets, DeFi protocols, bots, and AI agents integrating with Hikari Protocol.

---

## 1. Stake XLM & Mint hXLM (TypeScript)

Using `@hikari/sdk`:

```typescript
import { HikariClient } from '@hikari/sdk';

const client = new HikariClient({ network: 'testnet' }); // sync — not async, no network call here

// 1. Preview expected shares (pure calculation from vault state you fetch separately,
//    e.g. from GET /api/telemetry — this method does not fetch anything itself)
const sharesOut = client.previewDeposit(
  500_0000000n,        // deposit amount in stroops (500 XLM)
  totalAssetsStroops,  // current vault total_assets(), as a bigint
  totalSharesStroops   // current vault total_shares(), as a bigint
);
console.log(`Depositing 500 XLM yields ~${sharesOut} hXLM shares (stroops)`);

// 2. Build the raw invocation payload (contractId/functionName/args — not a signed
//    or unsigned XDR by itself; the actual live app builds real XDRs server-side via
//    POST /api/build-deposit, which is what Freighter actually signs)
const payload = client.buildDepositTx(fromAddress, 500_0000000n);
```

---

## 2. Request Unbonding (Queue-based 0% fee)

```typescript
// 1. Build the unbonding-request invocation payload (real method name; not async)
const unbondPayload = client.buildRequestWithdrawalTx(userAddress, 250_0000000n);
// In the live app this is actually submitted via POST /api/build-withdraw, which returns
// a real signable transactionXdr — see frontend/server.js.

// 2. Once a ticket exists, parseTicketStatus() interprets its on-chain fields (ticket data
// and currentLedger are fetched separately — there is no getUnbondingTicket() method):
const status = client.parseTicketStatus(
  { unlockLedger: ticket.unlockLedger, claimed: ticket.claimed, cancelled: ticket.cancelled },
  currentLedger
); // returns "CLAIMED" | "CANCELLED" | "READY" | "IN_COOLDOWN"

if (status === "READY") {
  const claimPayload = client.buildClaimWithdrawalTx(userAddress, ticketId);
}
```

---

## 3. Wrap hXLM to whXLM (Static Collateral)

```typescript
// Wrap appreciating hXLM into static whXLM for lending on Blend
const wrapTx = await client.buildWrapTx({
  amount: '100',
  recipient: userAddress
});
```

---

## 4. Query Vault Telemetry via REST API

```bash
# Get live protocol statistics (real endpoint — /api/vault does not exist)
curl -s https://hikari-ebon.vercel.app/api/telemetry | jq

# This returns real, live-queried on-chain values (see frontend/server.js), shaped like:
# {
#   "status": "ONLINE",
#   "dataSource": "LIVE_SOROBAN_RPC",
#   "vaultState": { "totalAssetsStroops": "...", "reservePercentage": ... },
#   "oracleTelemetry": { "navStroops": "...", "aprBps": ..., "bunkerActive": false },
#   "circuitBreaker": { "isGateSealed": false, ... }
# }
# The exact numbers depend on live testnet state at request time — don't treat the shape above
# as fixed sample values to copy elsewhere.
```

---

## 5. AI Agent Staking via Model Context Protocol (MCP) — not implemented yet

There is no MCP server in this repository yet — see [docs/MCP.md](MCP.md) for the design intent and what would need to be built. Until it exists, an agent can call the same real REST endpoints a browser uses:

```bash
curl -s https://hikari-ebon.vercel.app/api/telemetry
curl -s -X POST https://hikari-ebon.vercel.app/api/build-withdraw \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "G...", "sharesAmount": "100"}'
# Returns an unsigned transactionXdr requesting queue-based unbonding — sign it with
# Freighter and POST it to /api/submit-tx. (See frontend/server.js for the exact shape.)
```

The user still signs the resulting transaction XDR locally via their wallet extension — the agent never holds or spends funds autonomously.
