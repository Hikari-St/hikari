# Hikari Protocol — Model Context Protocol (MCP) Server

> **Autonomous AI Agent Interface for Staking, Yield Aggregation & Telemetry**
> Exposes Hikari Protocol primitives as structured tools over JSON-RPC stdio for Claude, Cursor, ChatGPT, and Google Antigravity agents.

---

## 1. Overview

The Hikari MCP Server allows autonomous AI agents to interact with the Stellar Soroban liquid staking ecosystem. Agents can:
1. Discover real-time yield and APR across Blend, Phoenix, and Soroswap.
2. Quote `hXLM` minting and unbonding values.
3. Construct unsigned transaction payloads for user authorization.
4. Execute x402 sub-cent micropayments for automated strategy routing.

---

## 2. Configuration (`claude_desktop_config.json`)

Add to your Claude Desktop or Antigravity configuration:

```json
{
  "mcpServers": {
    "hikari": {
      "command": "node",
      "args": ["services/mcp/server.js"],
      "env": {
        "STELLAR_NETWORK": "testnet",
        "HORIZON_URL": "https://horizon-testnet.stellar.org"
      }
    }
  }
}
```

---

## 3. Tool Specifications

### 3.1 `hikari.vault.stats`
Queries global protocol reserves, APR, and Bunker Mode state.
- **Inputs**: None
- **Output**:
  ```json
  {
    "tvl": "485,000.00 XLM",
    "apr": "12.4%",
    "nav": "1.0000",
    "liquidReserveRatio": "15.4%",
    "bunkerMode": false
  }
  ```

### 3.2 `hikari.stake.quote`
Computes expected `hXLM` tokens received for a given native XLM deposit.
- **Inputs**: `{ "amount": "500" }`
- **Output**:
  ```json
  {
    "asset": "XLM",
    "amount": "500",
    "sharesOut": "495.12",
    "exchangeRate": "1 XLM = 0.9902 hXLM",
    "protocolFee": "0%"
  }
  ```

### 3.3 `hikari.stake.prepare`
Constructs an **unsigned** Soroban transaction XDR for client-side signing.
- **Inputs**: `{ "amount": "500", "senderPublicKey": "GB7T..." }`
- **Output**:
  ```json
  {
    "unsignedXdr": "AAAAAgAAAA...",
    "networkPassphrase": "Test SDF Network ; September 2015",
    "estimatedFee": "0.000021 XLM"
  }
  ```

### 3.4 `hikari.withdraw.quote`
Compares queue unbonding vs instant DEX swap.
- **Inputs**: `{ "shares": "250" }`
- **Output**:
  ```json
  {
    "queueOption": { "payout": "260.70 XLM", "waitDays": "1-3 days", "fee": "0%" },
    "dexOption": { "payout": "258.40 XLM", "waitSeconds": "10s", "fee": "0.8% slippage" }
  }
  ```

---

## 4. Security Bounds

The MCP server adheres strictly to non-custodial boundaries:
- **No Autonomous Spending**: The agent emits unsigned transaction XDRs. The user must explicitly sign via Freighter or Lobstr before any asset moves on-chain.
