# Hikari Protocol — Model Context Protocol (MCP) Server

> **Status: NOT IMPLEMENTED.** This document previously described a working MCP server
> (`services/mcp/server.js`) with four tools and a Claude Desktop config example. No such
> directory, file, or MCP server exists anywhere in this repository (`find . -iname "*mcp*"`
> returns nothing outside `docs/`). The example outputs also reused fabricated figures
> ("485,000.00 XLM" TVL, "12.4%" APR as fixed constants) rather than anything a real server ever
> returned. What follows is the original design as a spec/roadmap item, not a shipped feature.

---

## 1. Design intent

An MCP server would let AI agents (Claude, Cursor, etc.) interact with the vault over structured
tool calls instead of a browser: discover yield/APR, quote deposits and withdrawals, and construct
unsigned transaction XDRs for the user to sign locally. None of this is built yet.

## 2. What would need to be built

- An actual MCP server process (e.g. `services/mcp/server.js`) implementing the JSON-RPC stdio protocol.
- Tool handlers backed by the **real** existing endpoints — `/api/telemetry`, `/api/build-deposit`, `/api/build-withdraw`, `/api/token-balance` already exist and return real on-chain data, and would be the natural implementation behind tools like `hikari.vault.stats` / `hikari.stake.prepare` / `hikari.withdraw.quote`.
- A `claude_desktop_config.json` entry pointing at that real server, once it exists.

## 3. Security bounds (design intent, not yet enforced by any running server)

Any future MCP server should stay strictly non-custodial: emit only unsigned transaction XDRs, and require the user to sign via Freighter or another wallet before anything moves on-chain — consistent with how the existing `/api/build-deposit` and `/api/build-withdraw` endpoints already work today.
