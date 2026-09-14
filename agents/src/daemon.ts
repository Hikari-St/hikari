// agents/src/daemon.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Autonomous Agent Loop Daemon for Hikari Protocol

import fs from "fs";
import path from "path";
import {
  PolicyVerifier,
  AuditLogger,
  RiskEngine,
  PolicyRules,
  ProtocolState,
  RiskMetrics,
} from "hikari-engine";
import { AgentOrchestrator } from "./orchestrator.js";
import { MevBackrunEngine, DexPriceFeed, MevBundleExecutionReceipt } from "./mev_backrun.js";

export interface DaemonTelemetry {
  status: "ONLINE" | "PAUSED" | "BUNKER_MODE" | "SEALED";
  lastCycleTimestamp: number;
  totalCycles: number;
  activeStrategies: { id: string; name: string; allocationStroops: string; apyBps: number }[];
  vaultState: {
    totalAssetsStroops: string;
    idleAssetsStroops: string;
    allocatedAssetsStroops: string;
    reservePercentage: number;
  };
  mevMetrics: {
    totalCapturedStroops: string;
    vaultBoostStroops: string;
    lastBundle?: MevBundleExecutionReceipt;
  };
  circuitBreaker: {
    isGateSealed: boolean;
    isBunkerMode: boolean;
    haircutBps: number;
    drawdownBps: number;
  };
  recentLogs: string[];
}

export class HikariAutonomousDaemon {
  private verifier: PolicyVerifier;
  private auditLogger: AuditLogger;
  private riskEngine: RiskEngine;
  private orchestrator: AgentOrchestrator;
  private mevEngine: MevBackrunEngine;

  private isRunning: boolean = false;
  private cycleCount: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private totalMevCapturedStroops: bigint = 0n;
  private totalVaultBoostStroops: bigint = 0n;
  private lastMevBundle?: MevBundleExecutionReceipt;
  private logs: string[] = [];

  private protocolState: ProtocolState = {
    vaultAddress: "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5",
    totalAssetsStroops: 250_0000000n, // 250 XLM
    idleAssetsStroops: 150_0000000n,  // 150 XLM idle (60%)
    allocatedAssetsStroops: 100_0000000n,
    strategyAllocations: new Map([
      ["CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL", 50_0000000n], // Blend (50 XLM)
      ["CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5", 50_0000000n], // Phoenix (50 XLM)
    ]),
  };

  private rules: PolicyRules = {
    allowedAgents: new Set(["GAQZQABZADRIHXJSNS75OLEKNE65ZFU273PBSA6H23IHILQVFK3VQ5L2", "agent_execution_01"]),
    allowedStrategies: new Set([
      "strat_blend_backstop_01",
      "strat_blend_xlm_01",
      "strat_blend_xlm_lending_01",
      "strat_soroswap_xlm_usdc_01",
      "strat_phoenix_xlm_usdc_01",
      "strat_aqua_sdex_01",
      "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
      "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
    ]),

    maxTransactionSizeStroops: 25_000_0000000n,
    dailySpendCapStroops: 60_000_0000000n,
    maxSlippageBps: 50,
    minIdleReservePercentage: 15, // 15% mandatory idle reserve
    humanApprovalThresholdStroops: 15_000_0000000n,
  };

  constructor() {
    this.verifier = new PolicyVerifier(this.rules);
    this.auditLogger = new AuditLogger();
    this.riskEngine = new RiskEngine();
    this.orchestrator = new AgentOrchestrator(this.verifier, this.auditLogger);
    this.mevEngine = new MevBackrunEngine();
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}`;
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    console.log(entry);
  }

  public async runSingleCycle(): Promise<DaemonTelemetry> {
    this.cycleCount++;
    this.log(`--- [CYCLE #${this.cycleCount}] Autonomous Rebalance & MEV Scan ---`);

    // 1. Run native Soroban atomic MEV backrun scanner between Phoenix and Soroswap
    const basePrice = 0.1245 + (Math.sin(this.cycleCount) * 0.002);
    const spreadDelta = 0.0008 + ((this.cycleCount % 3) * 0.0005);


    const phoenixFeed: DexPriceFeed = {
      venue: "PhoenixCLAMM",
      pair: "XLM/USDC",
      bidPrice: basePrice,
      askPrice: basePrice + 0.0002,
      liquidityDepthStroops: 250_000_0000000n,
      timestamp: Date.now(),
    };

    const soroswapFeed: DexPriceFeed = {
      venue: "SoroswapAMM",
      pair: "XLM/USDC",
      bidPrice: basePrice + spreadDelta,
      askPrice: basePrice + spreadDelta + 0.0002,
      liquidityDepthStroops: 180_000_0000000n,
      timestamp: Date.now(),
    };

    const opp = this.mevEngine.scanArbitrage(phoenixFeed, soroswapFeed);
    if (opp) {
      this.log(`⚡ [MEV ENGINE] Arbitrage detected: Buy on ${opp.buyVenue}, Sell on ${opp.sellVenue} (Spread: ${opp.spreadBps} bps)`);
      const receipt = await this.mevEngine.executeBackrunBundle(opp, this.protocolState.vaultAddress);
      this.lastMevBundle = receipt;
      this.totalMevCapturedStroops += receipt.actualProfitStroops;
      this.totalVaultBoostStroops += receipt.vaultBoostStroops;
      this.protocolState.totalAssetsStroops += receipt.vaultBoostStroops;
      this.protocolState.idleAssetsStroops += receipt.vaultBoostStroops;
      this.log(`  ✓ Bundle confirmed! Tx: ${receipt.txHash.slice(0, 16)}... | +${(Number(receipt.vaultBoostStroops) / 1e7).toFixed(4)} XLM streamed to Vault`);
    }

    // 2. Risk Engine drawdown & circuit-breaker evaluation
    const metrics: RiskMetrics = {
      currentDrawdownBps: Math.floor(Math.random() * 250), // Normal variance < 2.5%
      portfolioVolatility: 38 + Math.floor(Math.random() * 10),
      collateralHealthBps: 13200,
      oracleFreshnessSeconds: 8,
      isDepegDetected: false,
    };
    const riskEval = this.riskEngine.evaluateRisk(this.protocolState, metrics);

    // 3. Orchestrator rebalance cycle
    await this.orchestrator.runOrchestrationCycle(this.protocolState);

    // 4. Save state to disk for frontend consumption
    const telemetry = this.buildTelemetry(riskEval.triggersGateSeal, riskEval.triggersBunkerMode, riskEval.suggestedHaircutBps, metrics.currentDrawdownBps);
    this.persistTelemetry(telemetry);

    return telemetry;
  }

  public start(intervalMs: number = 15000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log(`🚀 Hikari Autonomous Daemon started (Interval: ${intervalMs}ms)`);
    this.runSingleCycle().catch((err) => console.error("Daemon cycle error:", err));

    this.timer = setInterval(() => {
      this.runSingleCycle().catch((err) => console.error("Daemon cycle error:", err));
    }, intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.log("⏹️ Hikari Autonomous Daemon stopped.");
  }

  private buildTelemetry(
    isSealed: boolean,
    isBunker: boolean,
    haircutBps: number,
    drawdownBps: number
  ): DaemonTelemetry {
    const reservePct = Number((this.protocolState.idleAssetsStroops * 100n) / this.protocolState.totalAssetsStroops);
    return {
      status: isSealed ? "SEALED" : isBunker ? "BUNKER_MODE" : "ONLINE",
      lastCycleTimestamp: Date.now(),
      totalCycles: this.cycleCount,
      activeStrategies: [
        {
          id: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
          name: "Blend Protocol Lending (XLM Pool)",
          allocationStroops: this.protocolState.strategyAllocations.get("CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL")?.toString() || "0",
          apyBps: 780, // 7.8% APY
        },
        {
          id: "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
          name: "Phoenix Protocol CLAMM (Concentrated LP)",
          allocationStroops: this.protocolState.strategyAllocations.get("CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5")?.toString() || "0",
          apyBps: 1140, // 11.4% APY
        },
      ],
      vaultState: {
        totalAssetsStroops: this.protocolState.totalAssetsStroops.toString(),
        idleAssetsStroops: this.protocolState.idleAssetsStroops.toString(),
        allocatedAssetsStroops: this.protocolState.allocatedAssetsStroops.toString(),
        reservePercentage: reservePct,
      },
      mevMetrics: {
        totalCapturedStroops: this.totalMevCapturedStroops.toString(),
        vaultBoostStroops: this.totalVaultBoostStroops.toString(),
        lastBundle: this.lastMevBundle,
      },
      circuitBreaker: {
        isGateSealed: isSealed,
        isBunkerMode: isBunker,
        haircutBps,
        drawdownBps,
      },
      recentLogs: [...this.logs],
    };
  }

  private persistTelemetry(telemetry: DaemonTelemetry) {
    try {
      const dataDir = path.join(__dirname, "..", "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(dataDir, "daemon_state.json"),
        JSON.stringify(telemetry, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
        "utf-8"
      );

    } catch (err) {
      console.error("Failed to write telemetry data:", err);
    }
  }
}

// Standalone execution entrypoint
if (process.argv[1] && process.argv[1].endsWith("daemon.js")) {
  const daemon = new HikariAutonomousDaemon();
  if (process.argv.includes("--once")) {
    daemon.runSingleCycle().then(() => {
      console.log("Single cycle finished.");
      process.exit(0);
    });
  } else {
    daemon.start(10000); // 10s intervals
  }
}
