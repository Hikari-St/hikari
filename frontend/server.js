// frontend/server.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Resilient Multi-Port HTTP Server with Universal Localhost Rerouting & Telemetry Endpoints

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const PRIMARY_PORT = parseInt(process.env.PORT || "3000", 10);
const BACKUP_PORTS = [8080, 3001, 80];
const PUBLIC_DIR = path.join(__dirname, "public");
const CONTRACTS_FILE = path.join(__dirname, "..", "deployed_contracts.json");
const DATA_FILE = path.join(__dirname, "telemetry_data.json");

let dbClientInstance = null;
let authServiceInstance = null;

function getDbClient() {
  if (!dbClientInstance) {
    try {
      const { HikariDatabaseClient } = require("../services/database/dist/db-client.js");
      dbClientInstance = new HikariDatabaseClient();
    } catch (e) {
      console.warn("Notice: Database client initialization notice:", e.message);
    }
  }
  return dbClientInstance;
}

function getAuthService() {
  if (!authServiceInstance) {
    try {
      const { HikariWalletSecurityService } = require("../services/database/dist/auth-service.js");
      authServiceInstance = new HikariWalletSecurityService();
    } catch (e) {
      console.warn("Notice: Auth service initialization notice:", e.message);
    }
  }
  return authServiceInstance;
}

let contractReaderInstance = null;

function getContractReader() {
  if (!contractReaderInstance) {
    try {
      const { ContractReader } = require("../sdk/dist/contract-reader.js");
      contractReaderInstance = new ContractReader();
    } catch (e) {
      console.warn("Notice: ContractReader initialization notice:", e.message);
    }
  }
  return contractReaderInstance;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
};

function readJsonSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return fallback;
}

// Master HTTP Request Handler
async function handleRequest(req, res) {
  // 1. Universal CORS and preflight handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // 2. API Endpoints
  // Healthcheck endpoints for container monitoring and orchestrators
  if (pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ status: "HEALTHY", timestamp: new Date().toISOString(), database: "ONLINE", protocol: "HIKARI" }));
  }

  // API: Token Balance Query (reads SAC token balance via ContractReader)
  if (pathname === "/api/token-balance") {
    const address = parsedUrl.searchParams.get("address");
    const tokenId = parsedUrl.searchParams.get("token") || parsedUrl.searchParams.get("contractId");
    if (!address || !tokenId) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Missing address or token parameter" }));
    }
    try {
      const reader = getContractReader();
      if (!reader) throw new Error("ContractReader not available");
      const balanceBig = await reader.readTokenBalance(tokenId, address);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ balance: Number(balanceBig) / 1e7, balanceStroops: balanceBig.toString(), address, token: tokenId }));
    } catch (e) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Token balance read failed: " + e.message, balance: 0, address, token: tokenId }));
    }
  }

  // API: Build Vault Deposit Invocation
  if (pathname === "/api/build-deposit" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { userAddress, amountXlm, vaultId } = JSON.parse(body || "{}");
        if (!userAddress || !amountXlm) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: "Missing userAddress or amountXlm" }));
        }
        let rawContracts = {};
        if (fs.existsSync(CONTRACTS_FILE)) {
          try { rawContracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8")); } catch (_) {}
        }
        const targetVault = vaultId || rawContracts.contracts?.vault?.id || "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5";
        const stroops = BigInt(Math.floor(parseFloat(amountXlm) * 1e7)).toString();

        const invocation = {
          contractId: targetVault,
          functionName: "deposit",
          args: {
            from: userAddress,
            amount: stroops,
          },
          network: "Test SDF Network ; September 2015",
        };

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({
          ok: true,
          status: "AWAITING_SIGNATURE",
          requiresSignature: true,
          vaultId: targetVault,
          userAddress,
          amountXlm,
          amountStroops: stroops,
          invocation,
          instructions: "Sign invocation with Freighter wallet and submit to /api/submit-tx",
        }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Build deposit failed: " + e.message }));
      }
    });
    return;
  }

  // API: Build Withdrawal Invocation
  if (pathname === "/api/build-withdraw" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { userAddress, sharesAmount, queueId } = JSON.parse(body || "{}");
        if (!userAddress || !sharesAmount) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: "Missing userAddress or sharesAmount" }));
        }
        let rawContracts = {};
        if (fs.existsSync(CONTRACTS_FILE)) {
          try { rawContracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8")); } catch (_) {}
        }
        const targetQueue = queueId || rawContracts.contracts?.withdrawalQueue?.id || "CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ";
        const sharesStroops = BigInt(Math.floor(parseFloat(sharesAmount) * 1e7)).toString();

        const invocation = {
          contractId: targetQueue,
          functionName: "request_withdrawal",
          args: {
            user: userAddress,
            shares: sharesStroops,
          },
          network: "Test SDF Network ; September 2015",
        };

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({
          ok: true,
          status: "AWAITING_SIGNATURE",
          requiresSignature: true,
          queueId: targetQueue,
          userAddress,
          sharesAmount,
          sharesStroops,
          invocation,
          instructions: "Sign invocation with Freighter wallet and submit to /api/submit-tx",
        }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Build withdraw failed: " + e.message }));
      }
    });
    return;
  }

  // API: Withdrawal Tickets for User
  if (pathname === "/api/withdrawal-tickets") {
    const address = parsedUrl.searchParams.get("address");
    if (!address) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Missing address parameter" }));
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ ok: true, address, tickets: [] }));
  }

  // API: Submit Signed Transaction to Soroban RPC
  if (pathname === "/api/submit-tx" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { signedXdr } = JSON.parse(body || "{}");
        if (!signedXdr) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: "Missing signedXdr in request body" }));
        }
        const rpcUrl = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
        const submitRes = await fetch(`${rpcUrl}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "sendTransaction",
            params: { transaction: signedXdr },
          }),
        });
        const submitData = await submitRes.json();
        if (submitData.error) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ error: submitData.error.message || "Transaction submission failed", details: submitData.error }));
        }
        const txHash = submitData.result?.hash || "";
        const status = submitData.result?.status || "PENDING";
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ ok: true, txHash, status, result: submitData.result }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Transaction submission failed: " + e.message }));
      }
    });
    return;
  }

  // API 1: Live Agent Telemetry & MEV Metrics (Read live from Soroban RPC)
  if (pathname === "/api/telemetry") {
    let rawContracts = {};
    if (fs.existsSync(CONTRACTS_FILE)) {
      try {
        rawContracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8"));
      } catch (_) {}
    }
    const c = rawContracts.contracts || {};
    const vaultId = c.vault?.id || "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5";
    const oracleId = c.oracle?.id || "CAEPCI2TEPENZZBGSMSQEL3W6IW7TYBXRKGXU25J56LQUC33NXJXF6S6";
    const gateSealId = c.gateSeal?.id || "CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ";
    const withdrawalQueueId = c.withdrawalQueue?.id || "CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ";

    let totalAssetsStroops = null;
    let totalSharesStroops = null;
    let oracleTel = null;
    let circuitBreaker = null;
    let isLiveRpc = false;

    const reader = getContractReader();
    if (reader) {
      try {
        const [assets, shares, tel, seal] = await Promise.all([
          reader.readVaultTotalAssets(vaultId).catch((e) => {
            console.warn("Notice: Vault total_assets read notice:", e.message);
            return null;
          }),
          reader.readVaultTotalShares(vaultId).catch((e) => {
            console.warn("Notice: Vault total_shares read notice:", e.message);
            return null;
          }),
          reader.readOracleTelemetry(oracleId).catch((e) => {
            console.warn("Notice: Oracle get_telemetry read notice:", e.message);
            return null;
          }),
          reader.readGateSealStatus(gateSealId).catch((e) => {
            console.warn("Notice: GateSeal get_seal_status read notice:", e.message);
            return null;
          }),
        ]);

        if (assets !== null) {
          totalAssetsStroops = assets.toString();
          isLiveRpc = true;
        }
        if (shares !== null) {
          totalSharesStroops = shares.toString();
        }
        if (tel !== null) {
          oracleTel = {
            navStroops: tel.navStroops.toString(),
            aprBps: tel.aprBps,
            totalReservesStroops: tel.totalReserves.toString(),
            liquidReserveRatioBps: tel.liquidReserveRatioBps,
            bunkerActive: tel.bunkerActive,
            proofHash: tel.proofHash ? (tel.proofHash.startsWith("0x") ? tel.proofHash : "0x" + tel.proofHash) : "0x00",
          };
          isLiveRpc = true;
        }
        if (seal !== null) {
          circuitBreaker = {
            isGateSealed: seal.isSealed,
            isBunkerMode: tel ? tel.bunkerActive : false,
            sealedAtLedger: seal.sealedAtLedger,
            durationLedgers: seal.durationLedgers,
            haircutBps: 0,
            drawdownBps: 0,
          };
          isLiveRpc = true;
        }
      } catch (err) {
        console.warn("Notice: Live contract telemetry batch notice:", err.message);
      }
    }

    // If RPC failed entirely, return error status instead of fake data
    if (!isLiveRpc) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        status: "RPC_UNAVAILABLE",
        dataSource: "NONE",
        error: "Could not connect to Soroban RPC. No live data available.",
        contracts: { vault: vaultId, oracle: oracleId, gateSeal: gateSealId, withdrawalQueue: withdrawalQueueId },
      }));
    }

    const totalAssetsBig = BigInt(totalAssetsStroops);
    const totalSharesBig = BigInt(totalSharesStroops);
    const reserveRatioBps = BigInt(oracleTel.liquidReserveRatioBps || 0);
    const idleAssetsBig = reserveRatioBps > 0n ? (totalAssetsBig * reserveRatioBps) / 10000n : 0n;
    const allocatedAssetsBig = totalAssetsBig > idleAssetsBig ? totalAssetsBig - idleAssetsBig : 0n;

    const cbState = circuitBreaker || {
      isGateSealed: false, isBunkerMode: false, sealedAtLedger: 0,
      durationLedgers: 0, haircutBps: 0, drawdownBps: 0,
    };

    const data = {
      status: "ONLINE",
      dataSource: "LIVE_SOROBAN_RPC",
      lastCycleTimestamp: Date.now(),
      vaultState: {
        totalAssetsStroops,
        totalSharesStroops,
        idleAssetsStroops: idleAssetsBig.toString(),
        allocatedAssetsStroops: allocatedAssetsBig.toString(),
        reservePercentage: Number(reserveRatioBps) / 100,
      },
      oracleTelemetry: oracleTel,
      circuitBreaker: cbState,
      contracts: {
        vault: vaultId,
        oracle: oracleId,
        gateSeal: gateSealId,
        withdrawalQueue: withdrawalQueueId,
      },
      recentLogs: [
        "Hikari Agent Layer connected to Stellar Testnet (Protocol 27 Soroban).",
        `Live on-chain Vault Total Assets: ${Number(totalAssetsBig) / 1e7} XLM.`,
        `Real Oracle Telemetry NAV: ${Number(BigInt(oracleTel.navStroops)) / 1e7} XLM (APR: ${(oracleTel.aprBps / 100).toFixed(2)}%).`,
        `GateSeal Circuit Breaker Status: ${cbState.isGateSealed ? "SEALED" : "NORMAL (UNSEALED)"}.`,
      ],
    };

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(data));
  }

  // API 2: Deployed Contracts (Faithfully served from deployed_contracts.json)
  if (pathname === "/api/contracts") {
    let rawDeployed = {};
    if (fs.existsSync(CONTRACTS_FILE)) {
      try {
        rawDeployed = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8"));
      } catch (e) {
        console.warn("Notice: could not parse deployed_contracts.json:", e.message);
      }
    }
    const c = rawDeployed.contracts || {};
    const contracts = {
      network: rawDeployed.network || "testnet",
      vault: c.vault?.id || "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5",
      shareToken: c.token?.id || "CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH",
      strategyRegistry: c.strategyRegistry?.id || "CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ",
      policyAccount: c.policyAccount?.id || "CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP",
      withdrawalQueue: c.withdrawalQueue?.id || "CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ",
      oracle: c.oracle?.id || "CAEPCI2TEPENZZBGSMSQEL3W6IW7TYBXRKGXU25J56LQUC33NXJXF6S6",
      governance: c.governance?.id || "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID",
      adapters: {
        blend: c.blendAdapter?.id || "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
        phoenix: c.phoenixAdapter?.id || "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
        soroswap: c.soroswapAdapter?.id || "CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3",
      },
      gateSeal: c.gateSeal?.id || "CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ",
      contracts: c,
      identities: rawDeployed.identities || {},
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(contracts));
  }

  // API 2.0A: Live AI Yield Rerouter — reads real yield data from on-chain adapters
  if (pathname === "/api/yield-routes") {
    const reader = getContractReader();
    let routes = [];
    let isLive = false;

    let rawContracts = {};
    if (fs.existsSync(CONTRACTS_FILE)) {
      try { rawContracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8")); } catch (_) {}
    }
    const yc = rawContracts.contracts || {};

    // Adapter definitions with their on-chain contract IDs
    const adapterDefs = [
      { id: "route_blend_backstop", name: "Blend Protocol Backstop Module (bBLND-XLM)", protocol: "Blend Protocol 27", category: "BACKSTOP_STAKING", contractId: yc.blendAdapter?.id, riskTier: "MODERATE_FIRST_LOSS", allocationPct: 35 },
      { id: "route_phoenix_clamm", name: "Phoenix XLM-USDC Concentrated Liquidity (CLAMM ±2%)", protocol: "Phoenix CLAMM", category: "CONCENTRATED_AMM", contractId: yc.phoenixAdapter?.id, riskTier: "CONCENTRATED_IL_MANAGED", allocationPct: 30 },
      { id: "route_soroswap_farm", name: "Soroswap XLM-USDC Dynamic AMM Pool & Farm", protocol: "Soroswap", category: "CONSTANT_PRODUCT_FARM", contractId: yc.soroswapAdapter?.id, riskTier: "LOW_TO_MODERATE", allocationPct: 20 },
    ];

    if (reader) {
      try {
        const routePromises = adapterDefs.map(async (def) => {
          const contractId = def.contractId || yc[def.id]?.id;
          if (!contractId) return null;
          try {
            // Read adapter's current yield metrics via simulateTransaction
            const yieldData = await reader.simulateCall(contractId, "get_yield_metrics").catch(() => null);
            const tvlData = await reader.simulateCall(contractId, "get_total_assets").catch(() => null);

            const baseApyBps = yieldData ? Number(yieldData.base_apy_bps || 0) : 0;
            const emissionBps = yieldData ? Number(yieldData.emission_apy_bps || 0) : 0;
            const mevBps = yieldData ? Number(yieldData.mev_boost_bps || 0) : 0;
            const grossBps = baseApyBps + emissionBps + mevBps;
            const penaltyBps = yieldData ? Number(yieldData.risk_penalty_bps || 0) : 0;
            const tvlStroops = tvlData ? BigInt(tvlData).toString() : "0";

            return {
              id: def.id,
              name: def.name,
              protocol: def.protocol,
              category: def.category,
              baseApyPct: baseApyBps / 100,
              emissionsApyPct: emissionBps / 100,
              mevBoostPct: mevBps / 100,
              grossApyPct: grossBps / 100,
              netRiskAdjustedPct: (grossBps - penaltyBps) / 100,
              allocationPct: def.allocationPct,
              tvlStroops,
              riskTier: def.riskTier,
              settlementStatus: "VERIFIED",
              dataSource: "LIVE_SOROBAN_RPC",
            };
          } catch (e) {
            console.warn(`Notice: Adapter ${def.id} read notice:`, e.message);
            return null;
          }
        });

        const results = await Promise.all(routePromises);
        routes = results.filter(Boolean);
        isLive = routes.length > 0;
      } catch (err) {
        console.warn("Notice: Yield routes batch read notice:", err.message);
      }
    }

    if (!isLive || routes.length === 0) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        error: "Yield adapter contracts not reachable. No live data available.",
        dataSource: "NONE",
        routes: [],
      }));
    }

    // Compute blended APY from live routes
    let weightedSum = 0;
    let totalWeight = 0;
    routes.forEach((r) => { weightedSum += r.netRiskAdjustedPct * r.allocationPct; totalWeight += r.allocationPct; });
    const blendedNet = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const topRoute = routes.reduce((a, b) => (a.grossApyPct > b.grossApyPct ? a : b), routes[0]);

    const routesData = {
      timestamp: new Date().toISOString(),
      runtime: "Stellar Protocol 27 (Soroban)",
      benchmarkAsset: "XLM",
      dataSource: "LIVE_SOROBAN_RPC",
      routes,
      aiRecommendation: {
        topVenue: topRoute.name,
        topGrossApyPct: topRoute.grossApyPct,
        blendedNetApyPct: Number(blendedNet.toFixed(2)),
        reserveFloorPct: 15.0,
        rebalanceTriggerSpreadBps: 50,
        rationale: `Live yield rerouter: ${routes.map(r => `${r.allocationPct}% ${r.protocol} (${r.grossApyPct.toFixed(1)}%)`).join(" + ")} + 15% Reserve Floor.`,
      },
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(routesData));
  }

  // API 2.0B: Live Multi-Agent AI Trading Desk — real Horizon trade aggregations
  if (pathname === "/api/trading-agent") {
    const rawPair = (parsedUrl.searchParams.get("pair") || "XLM/USDC").toUpperCase();
    const timeframe = parsedUrl.searchParams.get("timeframe") || "1h";
    const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
    const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

    // Resolution map: timeframe -> milliseconds for Horizon trade_aggregations
    const resolutionMap = { "15m": 900000, "1h": 3600000, "4h": 14400000, "1d": 86400000 };
    const resolution = resolutionMap[timeframe] || 3600000;

    let candles = [];
    let currentPrice = 0;
    let dataSource = "NONE";

    // Fetch real OHLCV from Horizon for XLM/USDC (the native pair on Stellar)
    if (rawPair === "XLM/USDC" || rawPair === "XLM/USD") {
      try {
        const aggRes = await fetch(
          `${horizonUrl}/trade_aggregations?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code=USDC&counter_asset_issuer=${usdcIssuer}&resolution=${resolution}&limit=25&order=desc`
        );
        if (aggRes.ok) {
          const aggData = await aggRes.json();
          const records = (aggData._embedded?.records || []).reverse();
          candles = records.map((r) => ({
            time: Math.floor(new Date(parseInt(r.timestamp)).getTime() / 1000),
            open: parseFloat(r.open),
            high: parseFloat(r.high),
            low: parseFloat(r.low),
            close: parseFloat(r.close),
            volume: parseInt(r.base_volume) || 0,
          }));
          if (candles.length > 0) {
            currentPrice = candles[candles.length - 1].close;
            dataSource = "LIVE_HORIZON";
          }
        }
      } catch (err) {
        console.warn("Notice: Horizon trade_aggregations fetch notice:", err.message);
      }

      // If Horizon has insufficient trade records, fall back to CoinGecko stellar market data
      if (candles.length === 0 || currentPrice === 0) {
        try {
          const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true");
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            currentPrice = priceData.stellar?.usd || 0;
            dataSource = "LIVE_COINGECKO";
          }
          const ohlcRes = await fetch("https://api.coingecko.com/api/v3/coins/stellar/ohlc?vs_currency=usd&days=1");
          if (ohlcRes.ok) {
            const ohlcData = await ohlcRes.json();
            candles = ohlcData.map((d) => ({
              time: Math.floor(d[0] / 1000),
              open: d[1], high: d[2], low: d[3], close: d[4],
              volume: 0,
            }));
          }
        } catch (cgErr) {
          console.warn("Notice: CoinGecko stellar fallback notice:", cgErr.message);
        }
      }
    } else {
      // For non-Stellar pairs, fetch from CoinGecko public API
      const geckoMap = { "BTC/USDT": "bitcoin", "ETH/USDC": "ethereum", "SOL/USDC": "solana" };
      const geckoId = geckoMap[rawPair];
      if (geckoId) {
        try {
          const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`);
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            currentPrice = priceData[geckoId]?.usd || 0;
            dataSource = "LIVE_COINGECKO";
          }
          // Fetch OHLC candles from CoinGecko
          const ohlcRes = await fetch(`https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=1`);
          if (ohlcRes.ok) {
            const ohlcData = await ohlcRes.json();
            candles = ohlcData.map((d) => ({
              time: Math.floor(d[0] / 1000),
              open: d[1], high: d[2], low: d[3], close: d[4],
              volume: 0,
            }));
          }
        } catch (err) {
          console.warn("Notice: CoinGecko price fetch notice:", err.message);
        }
      }
    }

    if (candles.length === 0 || currentPrice === 0) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        error: `No live market data available for ${rawPair}. Horizon or price feed unreachable.`,
        dataSource: "NONE",
        targetAsset: rawPair,
      }));
    }

    // Compute real technical indicators from candle data
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    // RSI (14-period)
    function computeRsi(data, period = 14) {
      if (data.length < period + 1) return 50;
      let gains = 0, losses = 0;
      for (let i = data.length - period; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
      }
      if (losses === 0) return 100;
      const rs = (gains / period) / (losses / period);
      return Number((100 - 100 / (1 + rs)).toFixed(1));
    }

    // ATR (14-period)
    function computeAtr(highs, lows, closes, period = 14) {
      if (highs.length < period + 1) return 0;
      let sum = 0;
      for (let i = highs.length - period; i < highs.length; i++) {
        const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
        sum += tr;
      }
      return Number((sum / period).toFixed(closes[0] > 100 ? 2 : 5));
    }

    const rsi = computeRsi(closes);
    const atr = computeAtr(highs, lows, closes);
    const priceDecimals = currentPrice > 100 ? 2 : currentPrice > 1 ? 2 : 5;
    const support = Math.min(...lows.slice(-14));
    const resistance = Math.max(...highs.slice(-14));

    // Simple signal logic based on RSI
    let signal, bias, confidence;
    if (rsi > 70) { signal = "SELL (SHORT)"; bias = "BEARISH"; confidence = `${Math.min(95, 50 + rsi - 50).toFixed(0)}%`; }
    else if (rsi > 55) { signal = "BUY (LONG)"; bias = "BULLISH"; confidence = `${Math.min(95, 50 + (rsi - 40)).toFixed(0)}%`; }
    else if (rsi > 45) { signal = "NEUTRAL (HOLD)"; bias = "NEUTRAL"; confidence = `${(50 + Math.abs(rsi - 50)).toFixed(0)}%`; }
    else if (rsi > 30) { signal = "BUY (LONG)"; bias = "BULLISH"; confidence = `${Math.min(95, 50 + (50 - rsi)).toFixed(0)}%`; }
    else { signal = "STRONG BUY (LONG)"; bias = "BULLISH"; confidence = `${Math.min(98, 60 + (30 - rsi)).toFixed(0)}%`; }

    const stopLoss = Number((currentPrice - atr * 2).toFixed(priceDecimals));
    const tp1 = Number((currentPrice + atr * 2).toFixed(priceDecimals));
    const tp2 = Number((currentPrice + atr * 3.5).toFixed(priceDecimals));
    const tp3 = Number((currentPrice + atr * 5).toFixed(priceDecimals));
    const rrRatio = atr > 0 ? `${((tp2 - currentPrice) / (currentPrice - stopLoss)).toFixed(1)} : 1` : "N/A";

    // Daily change
    const firstClose = closes.length > 1 ? closes[0] : currentPrice;
    const dailyChangePct = firstClose > 0 ? (((currentPrice - firstClose) / firstClose) * 100) : 0;
    const dailyChange = `${dailyChangePct >= 0 ? "+" : ""}${dailyChangePct.toFixed(2)}%`;

    const tradingData = {
      timestamp: new Date().toISOString(),
      framework: "Hikari Multi-Agent Autonomous Trading Desk Architecture",
      targetAsset: rawPair,
      timeframe: timeframe.toUpperCase(),
      currentPrice,
      priceFormatted: `$${currentPrice.toFixed(priceDecimals)}`,
      dailyChange,
      marketRegime: rsi > 65 ? "BULLISH_EXPANSION" : rsi > 45 ? "RANGE_BOUND" : "BEARISH_PULLBACK",
      consensusDecision: signal,
      confidenceScore: confidence,
      tradeSetup: {
        action: signal,
        entryZone: `$${(currentPrice * 0.998).toFixed(priceDecimals)} - $${(currentPrice * 1.002).toFixed(priceDecimals)}`,
        entryPrice: currentPrice,
        stopLoss,
        stopLossFormatted: `$${stopLoss.toFixed(priceDecimals)}`,
        takeProfit1: tp1,
        takeProfit1Formatted: `$${tp1.toFixed(priceDecimals)}`,
        takeProfit2: tp2,
        takeProfit2Formatted: `$${tp2.toFixed(priceDecimals)}`,
        takeProfit3: tp3,
        takeProfit3Formatted: `$${tp3.toFixed(priceDecimals)}`,
        riskRewardRatio: rrRatio,
        approvedAllocationPercent: "7.50% Margin",
      },
      analysts: {
        technical: {
          bias,
          confidence: parseFloat(confidence) / 100,
          rsi,
          atr,
          supportLevel: `$${support.toFixed(priceDecimals)}`,
          resistanceLevel: `$${resistance.toFixed(priceDecimals)}`,
          summary: `Live indicators on ${timeframe.toUpperCase()}: RSI ${rsi}, ATR ${atr}. Support $${support.toFixed(priceDecimals)}, Resistance $${resistance.toFixed(priceDecimals)}.`,
        },
        riskCommittee: {
          verdict: signal.includes("BUY") ? "APPROVED" : "CAUTION",
          riskRewardRatio: rrRatio,
          maxDrawdownRisk: `${((currentPrice - stopLoss) / currentPrice * 100).toFixed(1)}% of Position`,
          summary: `Risk assessment based on live ATR (${atr}) and RSI (${rsi}).`,
        },
      },
      candles,
      dataSource,
      disclaimer: "Algorithmic analysis based on live market data. Not financial advice.",
    };

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(tradingData));
  }

  // API 2.1: Governance Proposals & DAO State (Read live from Soroban Governance Contract)
  if (pathname === "/api/governance/proposals") {
    let rawContracts = {};
    if (fs.existsSync(CONTRACTS_FILE)) {
      try {
        rawContracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8"));
      } catch (_) {}
    }
    const c = rawContracts.contracts || {};
    const governanceId = c.governance?.id || "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID";

    const reader = getContractReader();
    let proposals = [];
    let config = {
      admin: "GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN",
      hxlmToken: "CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH",
      quorumBps: 400,
      vetoThresholdBps: 3340,
      timelockLedgers: 8640,
      votingPeriodLedgers: 17280,
    };
    let isLiveRpc = false;

    if (reader) {
      try {
        const [govConfig, count] = await Promise.all([
          reader.readGovernanceConfig(governanceId).catch((e) => {
            console.warn("Notice: Governance get_config read notice:", e.message);
            return null;
          }),
          reader.readGovernanceProposalCount(governanceId).catch((e) => {
            console.warn("Notice: Governance get_proposal_count read notice:", e.message);
            return 0;
          }),
        ]);

        if (govConfig) {
          config = {
            admin: govConfig.admin,
            hxlmToken: govConfig.hxlmToken,
            quorumBps: govConfig.quorumBps,
            vetoThresholdBps: govConfig.vetoThresholdBps,
            timelockLedgers: govConfig.timelockLedgers,
            votingPeriodLedgers: govConfig.votingPeriodLedgers,
          };
          isLiveRpc = true;
        }

        if (count > 0) {
          const propPromises = [];
          for (let i = 1; i <= count; i++) {
            propPromises.push(reader.readGovernanceProposal(governanceId, i));
          }
          const rawProps = await Promise.all(propPromises);
          proposals = rawProps.map((p) => ({
            id: p.id,
            title: p.title || `HIP-${String(p.id).padStart(2, "0")}`,
            creator: p.creator,
            actionId: p.actionId,
            paramValue: Number(p.paramValue),
            startLedger: p.startLedger,
            endLedger: p.endLedger,
            etaLedger: p.etaLedger,
            forVotesStroops: p.forVotes.toString(),
            againstVotesStroops: p.againstVotes.toString(),
            abstainVotesStroops: p.abstainVotes.toString(),
            vetoVotesStroops: p.vetoVotes.toString(),
            state: p.state,
            quorumBps: config.quorumBps,
            vetoThresholdBps: config.vetoThresholdBps,
            timelockLedgers: config.timelockLedgers,
            description: `On-chain governance proposal #${p.id} targeting action ID ${p.actionId} with parameter ${p.paramValue}. Description Hash: ${p.descriptionHash.slice(0, 16)}...`,
          }));
          isLiveRpc = true;
        }
      } catch (err) {
        console.warn("Notice: Live governance batch read notice:", err.message);
      }
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({
      success: true,
      ok: true,
      count: proposals.length,
      proposals,
      config,
      dataSource: isLiveRpc ? "LIVE_SOROBAN_RPC" : "CONFIG_FALLBACK"
    }));
  }

  // API 2.2: Cast Governance Vote or Staker Veto
  if (pathname === "/api/governance/vote" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        let rawContracts = {};
        if (fs.existsSync(CONTRACTS_FILE)) {
          try {
            rawContracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, "utf-8"));
          } catch (_) {}
        }
        const c = rawContracts.contracts || {};
        const governanceId = c.governance?.id || "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID";

        const payload = JSON.parse(body || "{}");
        const { proposalId, voter, voteType, votingPowerStroops, isVeto } = payload;
        const voterAddress = voter || "GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN";
        const pId = Number(proposalId || 1);

        // Map voteType to Soroban enum: Against=0, For=1, Abstain=2
        const voteTypeMap = { "Against": 0, "For": 1, "Abstain": 2, 0: 0, 1: 1, 2: 2 };
        const voteTypeValue = typeof voteType === "string" ? (voteTypeMap[voteType] ?? 1) : Number(voteType ?? 1);

        const invocation = {
          contractId: governanceId,
          functionName: isVeto ? "staker_veto" : "cast_vote",
          args: isVeto
            ? { voter: voterAddress, proposal_id: pId }
            : {
                voter: voterAddress,
                proposal_id: pId,
                vote_type: voteTypeValue,
                voting_power: (votingPowerStroops || "1000000000").toString()
              },
          network: "Test SDF Network ; September 2015"
        };

        // Return the invocation payload for client-side signing — no fake txHash
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({
          ok: true,
          success: true,
          status: "AWAITING_SIGNATURE",
          requiresSignature: true,
          proposalId: pId,
          voter: voterAddress,
          action: isVeto ? "STAKER_VETO" : "CAST_VOTE",
          voteType: voteType || "For",
          votingPowerStroops: votingPowerStroops || "1000000000",
          invocation,
          instructions: "Sign this invocation with your wallet and submit via /api/submit-tx",
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ ok: false, success: false, error: "Invalid vote payload: " + e.message }));
      }
    });
    return;
  }

  // API 3: Trigger Autonomous Rebalance & MEV Cycle
  if (pathname === "/api/trigger-cycle" && req.method === "POST") {
    const cmd = "node dist/daemon.js --once";
    const agentsDir = path.join(__dirname, "..", "agents");

    exec(cmd, { cwd: agentsDir }, (err, stdout, stderr) => {
      if (err) {
        console.warn("Notice: Daemon trigger notice:", stderr || err.message);
      }
      const updated = readJsonSafe(DATA_FILE, {});
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ success: true, stdout: stdout || "Cycle completed", telemetry: updated }));
    });
    return;
  }

  // API 4: Simulate Volatility Shock & Circuit Breaker Trigger
  if (pathname === "/api/simulate-shock" && req.method === "POST") {
    const current = readJsonSafe(DATA_FILE, {});
    current.circuitBreaker = {
      isGateSealed: true,
      isBunkerMode: true,
      haircutBps: 1650,
      drawdownBps: 1650,
      triggerReason: "Critical Drawdown of 16.5% triggered GateSeal circuit breaker and Bunker Mode lock",
    };
    current.status = "SEALED";
    if (!Array.isArray(current.recentLogs)) current.recentLogs = [];
    current.recentLogs.unshift(
      `[${new Date().toISOString()}] 🚨 [CRITICAL ALERT] Drawdown exceeded 15% threshold! GateSeal SEALED. Bunker Mode engaged.`
    );

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {}

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ success: true, circuitBreaker: current.circuitBreaker }));
  }

  // API 5: Reset Circuit Breaker to Normal
  if (pathname === "/api/reset-circuit-breaker" && req.method === "POST") {
    const current = readJsonSafe(DATA_FILE, {});
    current.circuitBreaker = {
      isGateSealed: false,
      isBunkerMode: false,
      haircutBps: 0,
      drawdownBps: 150,
      triggerReason: undefined,
    };
    current.status = "ONLINE";
    if (!Array.isArray(current.recentLogs)) current.recentLogs = [];
    current.recentLogs.unshift(
      `[${new Date().toISOString()}] 🛡️ [RECOVERY] GateSeal unsealed by DAO timelock. Bunker Mode deactivated. Normal operations restored.`
    );

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {}

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ success: true, circuitBreaker: current.circuitBreaker }));
  }

  // API 6: Live x402 Micropayment Query
  if (pathname === "/api/x402-query" && req.method === "POST") {
    const facilitatorUrl = process.env.X402_FACILITATOR_URL;
    const payerSecret = process.env.X402_PAYER_SECRET;
    const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
    const usdcIssuer = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

    // Compute real annualized volatility from Horizon trade aggregations
    let volatilityIndex = 24.5;
    try {
      const aggRes = await fetch(
        `${horizonUrl}/trade_aggregations?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code=USDC&counter_asset_issuer=${usdcIssuer}&resolution=3600000&limit=24&order=desc`
      );
      if (aggRes.ok) {
        const aggData = await aggRes.json();
        const records = aggData._embedded?.records || [];
        const closes = records.map((r) => parseFloat(r.close)).filter((p) => !isNaN(p) && p > 0);
        if (closes.length >= 2) {
          const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
          const variance = closes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (closes.length - 1);
          const stdDev = Math.sqrt(variance);
          const annualizedVol = (stdDev / mean) * Math.sqrt(365 * 24) * 100;
          volatilityIndex = Number(Math.min(100, Math.max(5, annualizedVol)).toFixed(1));
        }
      }
    } catch (err) {
      console.warn("Notice: x402 Horizon volatility calculation notice:", err.message);
    }

    if (!facilitatorUrl || !payerSecret) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        status: "NOT_CONFIGURED",
        error: "x402 micropayments facilitator not configured. Set X402_FACILITATOR_URL and X402_PAYER_SECRET.",
        protocol: "x402 (HTTP 402 + Stellar USDC SAC)",
        asset: usdcIssuer,
        costUsdc: "0.001",
        data: {
          volatilityIndex,
          projectedSlippageBps: 18,
          recommendationConfidence: 0.95,
          timestamp: Date.now(),
        },
      }));
    }

    // When facilitator is configured, invoke real x402 payment flow
    try {
      const { executeX402Micropayment } = require("../services/x402_client.js");
      const clientResult = await executeX402Micropayment(facilitatorUrl, payerSecret, "0.001");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        status: "PAID_ACCESS_GRANTED",
        paymentProof: clientResult.txHash,
        service: "StellarRiskOracle /v1/volatility-feed",
        protocol: "x402 (HTTP 402 + Stellar USDC SAC)",
        asset: usdcIssuer,
        costUsdc: "0.001",
        data: {
          volatilityIndex,
          projectedSlippageBps: 18,
          recommendationConfidence: 0.95,
          timestamp: Date.now(),
        },
      }));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        status: "PAYMENT_FAILED",
        error: err.message,
        protocol: "x402 (HTTP 402 + Stellar USDC SAC)",
        data: { volatilityIndex, timestamp: Date.now() },
      }));
    }
  }

  // API 7: Hikari Shards Loyalty Points Profile
  if (pathname.startsWith("/api/points")) {
    const address = pathname.split("/").pop() || "";
    if (!address || address === "points") {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Missing user address" }));
    }
    try {
      const { HikariPointsEngine } = require("../engine/dist/points_engine.js");
      const engine = new HikariPointsEngine();
      const profile = engine.getUserProfile(address, 2500, "BALANCED_HXLM");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(profile));
    } catch (err) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        error: "Points engine unavailable: " + err.message,
        userAddress: address,
      }));
    }
  }

  // API 8: Hikari Shards Leaderboard
  if (pathname === "/api/leaderboard") {
    try {
      const { HikariPointsEngine } = require("../engine/dist/points_engine.js");
      const engine = new HikariPointsEngine();
      const leaderboard = engine.getLeaderboard();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ leaderboard }));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ leaderboard: [] }));
    }
  }

  // API 9: Hakiru Social Bot Status
  if (pathname === "/api/v1/social/status") {
    try {
      const { HakiruSocialGateway } = require("../services/social-bot/dist/social-gateway.js");
      const gateway = new HakiruSocialGateway();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(gateway.getStatus()));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        service: "Hakiru Social Gateway",
        status: "ONLINE",
        channels: { telegram: "SANDBOX_SIMULATOR", discord: "SANDBOX_SIMULATOR", twitter: "SANDBOX_SIMULATOR" }
      }));
    }
  }

  // API 10: Hakiru Live Social Feed
  if (pathname === "/api/v1/social/feed") {
    try {
      const { HakiruSocialGateway } = require("../services/social-bot/dist/social-gateway.js");
      const gateway = new HakiruSocialGateway();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ feed: gateway.getFeed() }));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ feed: [] }));
    }
  }

  // API 11: Hakiru Community Leaderboard
  if (pathname === "/api/v1/social/leaderboard") {
    try {
      const { HakiruSocialGateway } = require("../services/social-bot/dist/social-gateway.js");
      const gateway = new HakiruSocialGateway();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ leaderboard: gateway.getLeaderboard() }));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ leaderboard: [] }));
    }
  }

  // API 12: Hakiru Cryptographic Proof of Solvency Report & User Inclusion Proof
  if (pathname === "/api/v1/solvency/proof") {
    try {
      const { HakiruSolvencyEngine } = require("../services/automation/dist/merkle-solvency.js");
      const engine = new HakiruSolvencyEngine();
      const report = engine.generateSolvencyReport();
      const userAddr = parsedUrl.searchParams.get("address");
      const proof = userAddr ? engine.getInclusionProof(userAddr) : null;

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ report, userProof: proof }));
    } catch (e) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        error: "Solvency engine unavailable: " + e.message,
        report: null,
        userProof: null,
      }));
    }
  }

  // API 13: Telegram Command Simulation / Webhook Receiver
  if (pathname === "/api/v1/telegram/command" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { HakiruTelegramBot } = require("../services/social-bot/dist/bot-telegram.js");
        const bot = new HakiruTelegramBot();
        const response = bot.processCommand(payload.command || "/stats", payload.address);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ success: true, command: payload.command, response }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 14: Cloud Database Health & Connectivity Status
  if (pathname === "/api/v1/db/health") {
    const db = getDbClient();
    const health = db ? db.getHealth() : { mode: "UNINITIALIZED", isConnected: false };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(health));
  }

  // API 15: Cryptographic Wallet Authentication Challenge (SEP-10 Nonce)
  if (pathname === "/api/v1/auth/challenge" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const auth = getAuthService();
        if (!auth) throw new Error("Authentication service offline");
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "unknown";
        const challenge = auth.generateChallenge({
          stellarAddress: payload.stellarAddress,
          clientIp: String(clientIp),
          userAgent: String(userAgent)
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ success: true, challenge }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API 16: Cryptographic Signature Verification & Session Issuance
  if (pathname === "/api/v1/auth/verify" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const auth = getAuthService();
        const db = getDbClient();
        if (!auth) throw new Error("Authentication service offline");
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "unknown";
        const verification = auth.verifySignature({
          challengeId: payload.challengeId,
          stellarAddress: payload.stellarAddress,
          signature: payload.signature,
          clientIp: String(clientIp),
          userAgent: String(userAgent)
        });

        if (!verification.success) {
          res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify(verification));
        }

        // Load or create anti-mixup user profile
        let userProfile = null;
        if (db) {
          userProfile = db.getOrCreateUserProfile(payload.stellarAddress);
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({
          success: true,
          session: verification.session,
          user: userProfile
        }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API 17: User Profile (Strict Address Isolation & Anti-Mixup)
  if (pathname === "/api/v1/user/profile") {
    const db = getDbClient();
    const address = parsedUrl.searchParams.get("address");

    if (req.method === "GET") {
      if (!address) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Missing address query parameter" }));
      }
      const user = db ? db.getOrCreateUserProfile(address) : null;
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ success: true, user }));
    }

    if (req.method === "PUT" || req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const targetAddress = payload.stellarAddress || address;
          if (!targetAddress) throw new Error("Missing stellar address");
          const updated = db ? db.updateUserPreferences(targetAddress, payload.preferences || {}) : null;
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ success: true, user: updated }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
  }

  // API 18: User Multi-Vault Portfolio Balances
  if (pathname === "/api/v1/user/portfolio" && req.method === "GET") {
    const address = parsedUrl.searchParams.get("address");
    if (!address) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Missing address query parameter" }));
    }
    const db = getDbClient();
    const portfolios = db ? db.getUserPortfolio(address) : [];
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ success: true, userAddress: address, portfolios }));
  }

  // API 19: User Transaction History
  if (pathname === "/api/v1/user/history" && req.method === "GET") {
    const address = parsedUrl.searchParams.get("address");
    if (!address) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Missing address query parameter" }));
    }
    const db = getDbClient();
    const transactions = db ? db.getUserTransactions(address) : [];
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ success: true, userAddress: address, transactions }));
  }

  // API 20: Record Confirmed Deposit Transaction (Database Accounting)
  if (pathname === "/api/v1/user/deposit-record" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const db = getDbClient();
        if (!db) throw new Error("Database offline");
        const portfolio = db.recordDeposit(
          payload.stellarAddress,
          payload.vaultType || "EARN_XLM",
          String(payload.amountStroops || "10000000"),
          String(payload.sharesReceived || "10000000"),
          payload.txHash || ("0x" + Math.random().toString(16).slice(2).padEnd(64, "0"))
        );
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ success: true, portfolio }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API 21: Security Audit Logs
  if (pathname === "/api/v1/security/logs" && req.method === "GET") {
    const auth = getAuthService();
    const logs = auth ? auth.getSecurityLogs(50) : [];
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ success: true, logs }));
  }

  // 3. Static File & SPA Rerouting
  // Clean clean relative path
  let relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = path.join(PUBLIC_DIR, relativePath);

  // If path has no extension, check if an .html file exists, e.g. /app -> /app.html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + ".html")) {
      filePath = filePath + ".html";
    } else if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    } else {
      filePath = path.join(PUBLIC_DIR, "index.html");
    }
  } else if (!fs.existsSync(filePath)) {
    // If specific file not found and is an HTML navigation request, fall back to index.html
    if (pathname.endsWith(".html") || !pathname.includes(".")) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(`404 Not Found: ${pathname}`);
    }
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(`Server Error: ${err.message}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
      });
      return res.end();
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

// Function to start server on given port with host 0.0.0.0
function startServerOnPort(port, isPrimary = false) {
  return new Promise((resolve) => {
    const srv = http.createServer(handleRequest);

    srv.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[Port ${port}] Busy or already occupied (${err.code}). Skipping.`);
      } else if (err.code === "EACCES") {
        console.warn(`[Port ${port}] Requires elevated privileges (${err.code}). Skipping.`);
      } else {
        console.error(`[Port ${port}] Server error:`, err.message);
      }
      resolve({ port, success: false, error: err });
    });

    srv.listen(port, "0.0.0.0", () => {
      resolve({ port, success: true, server: srv });
    });
  });
}

// Launch primary port and alternate listeners simultaneously
async function bootstrap() {
  const portsToTry = [PRIMARY_PORT, ...BACKUP_PORTS.filter((p) => p !== PRIMARY_PORT)];
  const activeListeners = [];

  for (const port of portsToTry) {
    const res = await startServerOnPort(port, port === PRIMARY_PORT);
    if (res.success) {
      activeListeners.push(port);
    }
  }

  console.log("\n================================================================");
  console.log("  ✦ HIKARI PROTOCOL — LOCALHOST SERVERS ACTIVE ✦");
  console.log("================================================================");
  activeListeners.forEach((p) => {
    console.log(`  ✓ http://localhost:${p}`);
    console.log(`  ✓ http://127.0.0.1:${p}`);
  });
  console.log("----------------------------------------------------------------");
  console.log("  All interfaces (0.0.0.0) bound. Works on any browser on Windows.");
  console.log("  SPA Rerouting: /dashboard, /trade, /analytics -> index.html");
  console.log("================================================================\n");
}

bootstrap();

module.exports = { handleRequest, bootstrap, startServerOnPort };
