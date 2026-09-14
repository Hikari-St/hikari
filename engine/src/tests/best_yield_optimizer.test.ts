import test from "node:test";
import assert from "node:assert";
import { PolicyVerifier } from "../policy_verifier.js";
import { ActionProposal, ProtocolState, PolicyRules } from "../types.js";

test("Stellar Best Yield Optimizer - Top Venue Discovery & Scoring", () => {
  // Candidate Stellar yield venues
  const candidateVenues = [
    {
      strategyId: "strat_blend_backstop_01",
      name: "Blend Protocol Backstop Module (bBLND-XLM)",
      baseApyBps: 850,
      emissionBoostApyBps: 1300,
      mevAlphaBoostBps: 320,
      riskPenaltyBps: 160,
    },
    {
      strategyId: "strat_phoenix_xlm_usdc_01",
      name: "Phoenix XLM-USDC Concentrated Liquidity (CLAMM ±2%)",
      baseApyBps: 1860,
      emissionBoostApyBps: 0,
      mevAlphaBoostBps: 320,
      riskPenaltyBps: 180,
    },
    {
      strategyId: "strat_soroswap_xlm_usdc_01",
      name: "Soroswap XLM-USDC Dynamic AMM Pool & Farm",
      baseApyBps: 1040,
      emissionBoostApyBps: 480,
      mevAlphaBoostBps: 320,
      riskPenaltyBps: 140,
    },
    {
      strategyId: "strat_blend_xlm_lending_01",
      name: "Blend Protocol Senior XLM Lending + BLND Emissions",
      baseApyBps: 680,
      emissionBoostApyBps: 740,
      mevAlphaBoostBps: 0,
      riskPenaltyBps: 40,
    },
  ];

  const ranked = candidateVenues.map((v) => {
    const nominal = v.baseApyBps + v.emissionBoostApyBps + v.mevAlphaBoostBps;
    const riskAdjusted = nominal - v.riskPenaltyBps;
    return {
      ...v,
      nominalApyBps: nominal,
      riskAdjustedApyBps: riskAdjusted,
      score: riskAdjusted / 100,
    };
  }).sort((a, b) => b.score - a.score);

  // Assert Blend Backstop is #1 with highest composite yield (24.70% nominal)
  assert.strictEqual(ranked[0].strategyId, "strat_blend_backstop_01");
  assert.strictEqual(ranked[0].nominalApyBps, 2470);
  assert.strictEqual(ranked[0].riskAdjustedApyBps, 2310);

  // Assert Phoenix CLAMM is #2 with strong 21.80% nominal
  assert.strictEqual(ranked[1].strategyId, "strat_phoenix_xlm_usdc_01");
  assert.strictEqual(ranked[1].nominalApyBps, 2180);
});

test("Stellar Best Yield Optimizer - Enforces 15% Reserve Floor & Policy Bounds", () => {
  const rules: PolicyRules = {
    allowedAgents: new Set(["agent_execution_01"]),
    allowedStrategies: new Set([
      "strat_blend_backstop_01",
      "strat_phoenix_xlm_usdc_01",
      "strat_soroswap_xlm_usdc_01",
    ]),
    maxTransactionSizeStroops: 50_000_0000000n, // 50k XLM
    dailySpendCapStroops: 200_000_0000000n,
    maxSlippageBps: 50,
    minIdleReservePercentage: 15, // 15% reserve floor
    humanApprovalThresholdStroops: 40_000_0000000n,
  };

  const verifier = new PolicyVerifier(rules);

  const state: ProtocolState = {
    vaultAddress: "CVAULT_BEST_YIELD",
    totalAssetsStroops: 100_000_0000000n, // 100,000 XLM
    idleAssetsStroops: 25_000_0000000n,   // 25,000 XLM idle (25%)
    allocatedAssetsStroops: 75_000_0000000n,
    strategyAllocations: new Map([
      ["strat_phoenix_xlm_usdc_01", 75_000_0000000n],
    ]),
  };

  // Sized allocation: 8,000 XLM (idle drops to 17,000 XLM = 17%, safely > 15% floor)
  const compliantProposal: ActionProposal = {
    id: "prop_best_yield_01",
    timestamp: Date.now(),
    proposerAgent: "agent_execution_01",
    actionType: "ALLOCATE",
    targetStrategy: "strat_blend_backstop_01",
    amountStroops: 8_000_0000000n,
    expectedYieldBps: 2470,
    maxSlippageBps: 30,
    rationale: "Deploying to #1 highest yield on Stellar: Blend Backstop Module at 24.70% APY",
  };

  const evalResult = verifier.evaluateProposal(compliantProposal, state);
  assert.strictEqual(evalResult.approved, true);
  assert.strictEqual(evalResult.violations.length, 0);

  // Excessive allocation: 15,000 XLM (would drop idle to 10,000 XLM = 10% < 15% floor)
  const violatingProposal: ActionProposal = {
    id: "prop_best_yield_02",
    timestamp: Date.now(),
    proposerAgent: "agent_execution_01",
    actionType: "ALLOCATE",
    targetStrategy: "strat_blend_backstop_01",
    amountStroops: 15_000_0000000n,
    expectedYieldBps: 2470,
    maxSlippageBps: 30,
    rationale: "Attempting oversized allocation",
  };

  const evalViolate = verifier.evaluateProposal(violatingProposal, state);
  assert.strictEqual(evalViolate.approved, false);
  assert.ok(evalViolate.violations.some((v) => v.includes("idle reserve") || v.includes("minimum")));
});
