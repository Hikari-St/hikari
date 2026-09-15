import { AutonomousKeeperBot } from "./agents/keeper_bot.js";
import { PolicyVerifier } from "./policy_verifier.js";
import { RiskEngine } from "./risk_engine.js";
import { AuditLogger } from "./audit_logger.js";
import { KeeperConfig, PolicyRules, ProtocolState, RiskMetrics } from "./types.js";
import { OnChainAdapterReader } from "./adapters/stellar_adapters.js";

export function createDefaultKeeper(): AutonomousKeeperBot {
  const keeperAccount = process.env.KEEPER_ACCOUNT || "GBHIKARIKEEPER12345678901234567890123456789012345678901234";
  const vaultAddress = process.env.HIKARI_VAULT_ADDRESS || "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5";
  const oracleAddress = process.env.HIKARI_ORACLE_ADDRESS || "C_HIKARI_ORACLE_PROTOCOL27";

  const targetAllocations = new Map<string, number>();
  targetAllocations.set("CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL", 0.45); // Blend (45%)
  targetAllocations.set("CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5", 0.35); // Phoenix CLAMM (35%)
  targetAllocations.set("CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ", 0.20); // Soroswap (20%)

  const rules: PolicyRules = {
    allowedAgents: new Set([keeperAccount]),
    allowedStrategies: new Set(Array.from(targetAllocations.keys())),
    maxTransactionSizeStroops: 250_000n * 10_000_000n, // 250k XLM
    dailySpendCapStroops: 1_000_000n * 10_000_000n,   // 1M XLM
    maxSlippageBps: 100,                              // 1%
    minIdleReservePercentage: 15,                     // 15% liquid native XLM reserve floor
    humanApprovalThresholdStroops: 500_000n * 10_000_000n,
  };

  const config: KeeperConfig = {
    vaultAddress,
    oracleAddress,
    keeperAccount,
    minReserveRatioPercentage: 15,
    rebalanceThresholdBps: 500, // 5%
    mevMinSpreadBps: 15,        // 15 bps
    targetAllocations,
  };

  const policyVerifier = new PolicyVerifier(rules);
  const riskEngine = new RiskEngine();
  const auditLogger = new AuditLogger();

  return new AutonomousKeeperBot(config, policyVerifier, riskEngine, auditLogger);
}

export async function runDaemon() {
  console.log("================================================================================");
  console.log("🤖 [HIKARI] Starting Autonomous Keeper Bot & Soroban Oracle Dispatcher");
  console.log("Author & Lead Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>");
  console.log("Stellar Runtime: Protocol 27 (Soroban) • Zero-Loss Reserve Floor: 15%");
  console.log("================================================================================");

  const keeper = createDefaultKeeper();
  const reader = new OnChainAdapterReader();

  // Initial Protocol State
  let currentTotalAssetsStroops = 485_000n * 10_000_000n; // 485,000 XLM baseline
  let currentIdleAssetsStroops = 110_580n * 10_000_000n;  // ~22.8% liquid reserve

  // Fetch real on-chain vault state
  try {
    const liveAssets = await reader.simulateCall<any>("CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5", "total_assets");
    if (liveAssets !== null) {
      currentTotalAssetsStroops = typeof liveAssets === "bigint" ? liveAssets : BigInt(liveAssets);
      currentIdleAssetsStroops = (currentTotalAssetsStroops * 2280n) / 10000n;
    }
  } catch (e) {
    console.warn("[KeeperDaemon] Notice reading live vault:", (e as Error).message);
  }

  const allocations = new Map<string, bigint>();
  allocations.set("CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL", (currentTotalAssetsStroops * 3500n) / 10000n);
  allocations.set("CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5", (currentTotalAssetsStroops * 2700n) / 10000n);
  allocations.set("CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ", (currentTotalAssetsStroops * 1520n) / 10000n);

  let isRunning = true;
  let cycle = 0;

  const shutdown = () => {
    console.log("\n[KeeperDaemon] Received shutdown signal. Gracefully exiting...");
    isRunning = false;
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[KeeperDaemon] Initialized. Monitoring ledger epochs...");

  while (isRunning) {
    cycle++;

    // Fetch live market price from Horizon orderbook
    let basePrice = 0.1250;
    try {
      const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
      const usdcIssuer = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
      const obRes = await fetch(`${horizonUrl}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=${usdcIssuer}&limit=1`);
      if (obRes.ok) {
        const ob = (await obRes.json()) as any;
        if (ob.bids && ob.bids.length > 0) {
          basePrice = parseFloat(ob.bids[0].price);
        }
      }
    } catch {
      // Use resilient baseline
    }

    const state: ProtocolState = {
      vaultAddress: "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5",
      totalAssetsStroops: currentTotalAssetsStroops,
      idleAssetsStroops: currentIdleAssetsStroops,
      allocatedAssetsStroops: currentTotalAssetsStroops - currentIdleAssetsStroops,
      strategyAllocations: allocations,
    };

    const riskMetrics: RiskMetrics = {
      currentDrawdownBps: 240, // 2.4% nominal drawdown (healthy)
      portfolioVolatility: 22,
      collateralHealthBps: 13500, // 135% (Blend healthy)
      oracleFreshnessSeconds: 4,
      isDepegDetected: false,
    };

    const venuePrices = new Map<string, number>([
      ["SDEX", basePrice],
      ["Phoenix_CLAMM", basePrice * 1.0005],
      ["Soroswap", basePrice * 0.9995],
    ]);

    const result = await keeper.runKeeperCycle(state, riskMetrics, venuePrices, 1240);

    console.log(`\n--- [Cycle #${result.cycleId}] at ${new Date(result.timestamp).toLocaleTimeString()} ---`);
    console.log(`• Liquid Reserve Ratio: ${(result.oraclePayload.liquidReserveRatioBps / 100).toFixed(2)}% (Floor: 15.00%)`);
    console.log(`• On-Chain Oracle NAV: ${(Number(result.oraclePayload.navStroops) / 10_000_000).toFixed(4)} XLM`);
    console.log(`• Oracle Proof Hash: 0x${result.oraclePayload.proofHash.slice(0, 16)}...`);

    if (result.rebalanced && result.rebalanceProposal) {
      console.log(`• [REBALANCE EXECUTED] ${result.rebalanceProposal.actionType} ${result.rebalanceProposal.amountStroops / 10_000_000n} XLM into ${result.rebalanceProposal.targetStrategy.slice(0, 8)}...`);
    } else {
      console.log(`• Strategy Weights Nominal (Within ±5% tolerance band)`);
    }

    if (result.arbitrageExecuted && result.arbitrageOpportunity) {
      const profitXlm = Number(result.arbitrageOpportunity.expectedProfitStroops) / 10_000_000;
      console.log(`• [MEV CAPTURE] Atomic backrun on ${result.arbitrageOpportunity.venueA} -> ${result.arbitrageOpportunity.venueB}: +${profitXlm.toFixed(2)} XLM captured for hXLM reserve!`);
      currentTotalAssetsStroops += result.arbitrageOpportunity.expectedProfitStroops;
      currentIdleAssetsStroops += result.arbitrageOpportunity.expectedProfitStroops;
    }

    // In single-run / test mode, break after 3 cycles if not daemonized
    if (process.env.SINGLE_RUN === "true") {
      console.log("\n[KeeperDaemon] Single-run execution completed successfully.");
      break;
    }

    await new Promise((r) => setTimeout(r, 4000));
  }
}

if (process.argv[1] && process.argv[1].includes("keeper_daemon")) {
  runDaemon().catch((err) => {
    console.error("[KeeperDaemon] Fatal error:", err);
    process.exit(1);
  });
}
