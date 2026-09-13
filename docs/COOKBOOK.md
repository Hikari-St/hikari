# Hikari Protocol — Developer Cookbook

> **End-to-End Code Recipes and Integration Snippets**
> Practical implementation patterns for wallets, DeFi protocols, bots, and AI agents integrating with Hikari Protocol.

---

## 1. Stake XLM & Mint hXLM (TypeScript)

Using `@hikari/sdk`:

```typescript
import { HikariClient } from '@hikari/sdk';

const client = new HikariClient({ network: 'testnet' });

// 1. Preview expected shares
const quote = await client.previewDeposit('500');
console.log(`Depositing 500 XLM yields ~${quote.sharesOut} hXLM`);

// 2. Build non-custodial deposit transaction
const tx = await client.buildDepositTx({
  amount: '500',
  recipient: 'GB7T3PZCHBOMWGJRKZZWWNSUKQLHGOHY7L443QG5P'
});

// 3. Sign and submit via Freighter
// const signedTx = await freighter.signTransaction(tx);
// const result = await server.submitTransaction(signedTx);
```

---

## 2. Request Unbonding (Queue-based 0% fee)

```typescript
// 1. Submit unbonding request (burns hXLM, generates claim ticket)
const unbondTx = await client.buildRequestWithdrawTx({
  shares: '250',
  recipient: 'GB7T3PZCHBOMWGJRKZZWWNSUKQLHGOHY7L443QG5P'
});

// 2. Check ticket cooldown status
const ticket = await client.getUnbondingTicket('ticket_101');
const status = client.parseTicketStatus(ticket);

if (status.isReady) {
  console.log(`Ready to claim ${status.claimableXlm} XLM!`);
  const claimTx = await client.buildClaimWithdrawTx({ ticketId: 'ticket_101' });
} else {
  console.log(`Unbonding in progress. Remaining time: ${status.cooldownRemaining}`);
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
# Get live protocol statistics
curl -s https://hikari-protocol.vercel.app/api/vault | jq

# Sample Response:
# {
#   "tvl": "485,000.00 XLM",
#   "apr": "12.4%",
#   "hxlmPrice": "$0.125",
#   "bunkerMode": false,
#   "liquidReserveRatio": "15.4%"
# }
```

---

## 5. AI Agent Staking via Model Context Protocol (MCP)

In Claude Desktop or Cursor:
```text
Prompt: "Check the current staking APR on Hikari Protocol and prepare an unbonding quote for 100 hXLM."
```
The agent calls:
```json
{
  "tool": "hikari_get_vault_stats",
  "arguments": {}
}
```
Followed by:
```json
{
  "tool": "hikari_quote_withdraw",
  "arguments": {
    "shares": "100",
    "route": "DEX_SWAP"
  }
}
```
The user signs the transaction locally via their wallet extension. The agent cannot spend funds autonomously.
