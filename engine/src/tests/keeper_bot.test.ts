import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { AutonomousKeeperBot } from "../agents/keeper_bot.js";
import { PolicyVerifier } from "../policy_verifier.js";
import { RiskEngine } from "../risk_engine.js";
import { AuditLogger } from "../audit_logger.js";
import { KeeperConfig, PolicyRules, ProtocolState, RiskMetrics } from "../types.js";

describe("AutonomousKeeperBot Engine & Soroban Oracle Dispatcher", () => {
  let keeper: AutonomousKeeperBot;
  let rules: PolicyRules;
  let config: KeeperConfig;

  const KEEPER_KEY = "GBKEEPER123456789012345678901234567890123456789012345678";
  const STRATEGY_BLEND = "C_BLEND_STRATEGY";
  const STRATEGY_PHOENIX = "C_PHOENIX_STRATEGY";
  const STRATEGY_SOROSWAP = "C_SOROSWAP_STRATEGY";

  beforeEach(() => {
    rules = {
      allowedAgents: new Set([KEEPER_KEY]),
      allowedStrategies: new Set([STRATEGY_BLEND, STRATEGY_PHOENIX, STRATEGY_SOROSWAP]),
      maxTransactionSizeStroops: 100_000n * 10_000_000n,
      dailySpendCapStroops: 500_000n * 10_000_000n,
      maxSlippageBps: 100, // 1%
      minIdleReservePercentage: 15, // 15% liquid native XLM reserve floor
      humanApprovalThresholdStroops: 200_000n * 10_000_000n,
    };

    const targetAllocations = new Map<string, number>();
    targetAllocations.set(STRATEGY_BLEND, 0.45);    // 45%
    targetAllocations.set(STRATEGY_PHOENIX, 0.35);  // 35%
    targetAllocations.set(STRATEGY_SOROSWAP, 0.20); // 20%

    config = {
      vaultAddress: "C_HIKARI_VAULT_CORE",
      oracleAddress: "C_HIKARI_ORACLE_CORE",
      keeperAccount: KEEPER_KEY,
      minReserveRatioPercentage: 15,
      rebalanceThresholdBps: 500, // 5% drift triggers rebalance
      mevMinSpreadBps: 15,        // 15 bps minimum MEV arb spread
      targetAllocations,
    };

    const verifier = new PolicyVerifier(rules);
    const riskEngine = new RiskEngine();
    const auditLogger = new AuditLogger();

    keeper = new AutonomousKeeperBot(config, verifier, riskEngine, auditLogger);
  });

  it("strictly enforces the 15% liquid native XLM reserve floor", () => {
    // Total: 100k XLM, Idle: 10k XLM (10% < 15% floor)
    const state: ProtocolState = {
      vaultAddress: config.vaultAddress,
      totalAssetsStroops: 100_000n * 10_000_000n,
      idleAssetsStroops: 10_000n * 10_000_000n,
      allocatedAssetsStroops: 90_000n * 10_000_000n,
      strategyAllocations: new Map([[STRATEGY_BLEND, 50_000n * 10_000_000n]]),
    };

    const check = keeper.evaluateRebalance(state);
    assert.strictEqual(check.proposal, undefined, "Must NOT generate allocation proposal when reserve floor is breached");
  });

  it("triggers rebalance proposal when strategy allocation drifts beyond 5% threshold", () => {
    // Total: 100k XLM, Idle: 30k XLM (30% > 15% floor)
    // Target Blend: 45k XLM (45%). Current Blend: 35k XLM (35% -> 10% drift > 5% threshold)
    const state: ProtocolState = {
      vaultAddress: config.vaultAddress,
      totalAssetsStroops: 100_000n * 10_000_000n,
      idleAssetsStroops: 30_000n * 10_000_000n,
      allocatedAssetsStroops: 70_000n * 10_000_000n,
      strategyAllocations: new Map([
        [STRATEGY_BLEND, 35_000n * 10_000_000n],    // Target 45k -> 10k drift (1000 bps)
        [STRATEGY_PHOENIX, 35_000n * 10_000_000n],  // Target 35k -> 0 drift
        [STRATEGY_SOROSWAP, 20_000n * 10_000_000n], // Target 20k -> 0 drift
      ]),
    };

    const check = keeper.evaluateRebalance(state);
    assert.ok(check.proposal !== undefined, "Should generate rebalance proposal");
    assert.strictEqual(check.proposal?.targetStrategy, STRATEGY_BLEND);
    assert.ok(check.driftBps >= 500, "Drift must be >= 500 bps");
  });

  it("detects and captures profitable atomic cross-DEX MEV arbitrage spreads", () => {
    const venuePrices = new Map<string, number>();
    venuePrices.set("SDEX", 0.1250);
    venuePrices.set("Phoenix_CLAMM", 0.1280); // 2.4% spread = 240 bps (> 15 bps min)

    const opp = keeper.scanMevOpportunities(venuePrices, 10_000n * 10_000_000n);
    assert.ok(opp !== undefined, "Should detect profitable arbitrage spread");
    assert.strictEqual(opp?.venueA, "SDEX");
    assert.strictEqual(opp?.venueB, "Phoenix_CLAMM");
    assert.ok(opp!.expectedProfitStroops > 0n, "Expected profit must be positive");
  });

  it("computes deterministic on-chain Oracle telemetry with RFC-8785 proof hash", () => {
    const state: ProtocolState = {
      vaultAddress: config.vaultAddress,
      totalAssetsStroops: 100_000n * 10_000_000n,
      idleAssetsStroops: 25_000n * 10_000_000n,
      allocatedAssetsStroops: 75_000n * 10_000_000n,
      strategyAllocations: new Map(),
    };

    const telemetry = keeper.computeOracleTelemetry(state, 1240, false);
    assert.strictEqual(telemetry.navStroops, 10_428_000n);
    assert.strictEqual(telemetry.aprBps, 1240);
    assert.strictEqual(telemetry.liquidReserveRatioBps, 2500); // 25.00%
    assert.strictEqual(telemetry.bunkerActive, false);
    assert.strictEqual(telemetry.proofHash.length, 64, "Proof hash must be a 64-char SHA256 hex string");
  });

  it("engages Bunker Mode and halts rebalancing when risk engine flags drawdown shock", async () => {
    const state: ProtocolState = {
      vaultAddress: config.vaultAddress,
      totalAssetsStroops: 100_000n * 10_000_000n,
      idleAssetsStroops: 30_000n * 10_000_000n,
      allocatedAssetsStroops: 70_000n * 10_000_000n,
      strategyAllocations: new Map([[STRATEGY_BLEND, 30_000n * 10_000_000n]]),
    };

    const shockMetrics: RiskMetrics = {
      currentDrawdownBps: 1250, // 12.5% drawdown (>10% threshold)
      portfolioVolatility: 45,
      collateralHealthBps: 11000,
      oracleFreshnessSeconds: 15,
      isDepegDetected: false,
    };

    const venuePrices = new Map<string, number>([["SDEX", 0.125], ["Phoenix", 0.125]]);
    const cycle = await keeper.runKeeperCycle(state, shockMetrics, venuePrices);

    assert.strictEqual(cycle.bunkerActive, true, "Bunker Mode must be active");
    assert.strictEqual(cycle.rebalanced, false, "Rebalancing must be paused under Bunker Mode");
    assert.strictEqual(cycle.oraclePayload.bunkerActive, true, "Oracle payload must reflect active Bunker Mode");
  });
});
