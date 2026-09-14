import {
  AuditLogger,
  PolicyVerifier,
  PolicyRules,
  ProtocolState,
} from "hikari-engine";
import { MarketAgent } from "./market_agent.js";
import { YieldAgent } from "./yield_agent.js";
import { RiskAgent } from "./risk_agent.js";
import { ExecutionAgent } from "./execution_agent.js";
import { PaymentAgent } from "./payment_agent.js";

export class AgentOrchestrator {
  private marketAgent = new MarketAgent();
  private yieldAgent = new YieldAgent();
  private riskAgent = new RiskAgent();
  private executionAgent = new ExecutionAgent();
  private paymentAgent = new PaymentAgent();

  constructor(
    private policyVerifier: PolicyVerifier,
    private auditLogger: AuditLogger
  ) {}

  public async runOrchestrationCycle(state: ProtocolState) {
    console.log("==================================================");
    console.log("🌟 [HIKARI ORCHESTRATOR] Starting Agentic Rebalance Cycle");
    console.log(`Vault State: Total=${state.totalAssetsStroops} stroops, Idle=${state.idleAssetsStroops} stroops`);
    console.log("==================================================");

    // Step 1: Payment Agent queries paid market telemetry via x402
    console.log("\n[1/5] Payment Agent checking machine data payment budget...");
    const canPay = this.paymentAgent.canPay({
      serviceName: "StellarRiskOracle",
      endpoint: "/v1/risk-feed",
      asset: "USDC",
      amountStroops: 100_0000n, // 0.01 USDC
      destination: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });
    if (canPay) {
      try {
        const receipt = await this.paymentAgent.settlePayment({
          serviceName: "StellarRiskOracle",
          endpoint: "/v1/risk-feed",
          asset: "USDC",
          amountStroops: 100_0000n,
          destination: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        });
        console.log(`  ✓ x402 Micropayment settled. TxHash: ${receipt.txHash}`);
      } catch (err: any) {
        const fallback = this.paymentAgent.fetchPublicOracleFallback("StellarRiskOracle", err.message);
        console.log(`  ℹ️ Telemetry Notice: ${fallback.notes}`);
      }
    }

    // Step 2: Market Agent gathers market condition
    console.log("\n[2/5] Market Agent gathering on-chain telemetry & market rates...");
    const market = await this.marketAgent.fetchMarketConditions();
    console.log(`  ✓ XLM Price: $${market.xlmPriceUsd} | Blend Total: ${(market.blendSupplyApyBps + market.blendEmissionApyBps) / 100}% | Phoenix CLAMM: ${market.phoenixFeeApyBps / 100}%`);
    console.log(`  ✓ Blend Backstop: ${market.blendBackstopApyBps / 100}% | Soroswap: ${(market.soroswapFeeApyBps + market.soroswapFarmApyBps) / 100}% | MEV Boost: +${market.mevStreamApyBps / 100}%`);

    // Step 3: Yield Agent ranks strategies & optimizes best yield
    console.log("\n[3/5] Yield Agent ranking candidate strategies for BEST YIELD in Stellar...");
    const ranked = this.yieldAgent.rankStrategies(market);
    const bestYield = this.yieldAgent.getBestYieldStrategy(market);
    const blendedApy = this.yieldAgent.calculateBlendedPortfolioApyBps(ranked);

    console.log(`  🏆 #1 BEST YIELD IN STELLAR: ${bestYield.name}`);
    console.log(`     ↳ Nominal APY: ${(bestYield.nominalApyBps / 100).toFixed(2)}% | Risk-Adjusted Score: ${bestYield.score.toFixed(2)} | Venue: ${bestYield.venue}`);
    console.log(`     ↳ Target Blended Portfolio APY: ${(blendedApy / 100).toFixed(2)}% net APY across deployed capital`);

    for (const s of ranked) {
      console.log(`  → ${s.name}: ${(s.nominalApyBps / 100).toFixed(2)}% APY (Net Risk-Adj: ${(s.riskAdjustedApyBps / 100).toFixed(2)}%, Score: ${s.score.toFixed(2)})`);
    }

    // Step 4: Risk Agent checks exposure and reserves
    console.log("\n[4/5] Risk Agent evaluating protocol exposure and reserve constraints...");
    const risk = this.riskAgent.evaluateExposure(state, ranked);
    for (const r of risk.reasons) {
      console.log(`  * ${r}`);
    }

    // Step 5: Execution Agent builds proposal
    console.log("\n[5/5] Execution Agent synthesizing structured proposal...");
    const proposal = this.executionAgent.buildProposal(risk, ranked);

    if (!proposal) {
      console.log("  ⚠️ No rebalance proposed by agents this cycle.");
      return;
    }

    console.log(`  ✓ Proposal generated: ${proposal.id}`);
    console.log(`    Action: ${proposal.actionType} ${proposal.amountStroops} stroops to ${proposal.targetStrategy}`);
    console.log(`    Rationale: ${proposal.rationale}`);

    // Step 6: Deterministic Policy Engine verification
    console.log("\n🛡️ [POLICY ENGINE] Verifying proposal against strict deterministic guardrails...");
    const evaluation = this.policyVerifier.evaluateProposal(proposal, state);

    // Step 7: Cryptographic Audit Logging
    const auditEntry = this.auditLogger.logDecision(proposal, evaluation);
    console.log(`  ✓ Audit Hash: ${auditEntry.entryHash}`);

    if (!evaluation.approved) {
      console.log("  ❌ PROPOSAL REJECTED BY POLICY ENGINE!");
      for (const v of evaluation.violations) {
        console.log(`    - VIOLATION: ${v}`);
      }
      return;
    }

    if (evaluation.requiresHumanApproval) {
      console.log("  ⏸️ PROPOSAL REQUIRES HUMAN APPROVAL (Flagged for Operator Review)");
      for (const n of evaluation.notes) {
        console.log(`    - NOTE: ${n}`);
      }
      return;
    }

    console.log("  ✅ PROPOSAL APPROVED! Ready for Soroban smart account execution.");

    // Step 8: Live On-Chain Transaction Submission via Soroban RPC
    console.log("\n🚀 [EXECUTION] Submitting approved allocation to Soroban Vault contract...");
    try {
      const txHash = await this.executionAgent.executeOnChain(proposal, state.vaultAddress);
      console.log(`  ✓ On-chain transaction confirmed!`);
      console.log(`    Tx Hash: ${txHash}`);
      console.log(`    Explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`);
    } catch (err: any) {
      console.error(`  ❌ On-chain execution notice: ${err.message}`);
    }
    console.log("==================================================\n");
  }
}

// Standalone simulation runner
async function main() {
  const rules: PolicyRules = {
    allowedAgents: new Set(["agent_execution_01"]),
    allowedStrategies: new Set([
      "strat_blend_backstop_01",
      "strat_phoenix_xlm_usdc_01",
      "strat_soroswap_xlm_usdc_01",
      "strat_blend_xlm_lending_01",
      "strat_blend_xlm_01",
      "strat_aqua_sdex_01",
    ]),
    maxTransactionSizeStroops: 25_000_0000000n, // 25,000 XLM
    dailySpendCapStroops: 100_000_0000000n,
    maxSlippageBps: 50,
    minIdleReservePercentage: 15,
    humanApprovalThresholdStroops: 15_000_0000000n, // 15,000 XLM
  };

  const state: ProtocolState = {
    vaultAddress: "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5",
    totalAssetsStroops: 250_0000000n, // 250 XLM
    idleAssetsStroops: 150_0000000n,   // 150 XLM idle
    allocatedAssetsStroops: 100_0000000n, // 100 XLM allocated
    strategyAllocations: new Map([
      ["strat_blend_xlm_lending_01", 50_0000000n],
      ["strat_phoenix_xlm_usdc_01", 50_0000000n],
    ]),
  };

  const verifier = new PolicyVerifier(rules);
  const logger = new AuditLogger();
  const orchestrator = new AgentOrchestrator(verifier, logger);

  await orchestrator.runOrchestrationCycle(state);
}

if (process.argv[1] && process.argv[1].endsWith("orchestrator.js")) {
  main().catch(console.error);
}
