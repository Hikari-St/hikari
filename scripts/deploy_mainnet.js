// scripts/deploy_mainnet.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
//
// Mainnet deployment is NOT implemented. This script only renders the planned
// governance parameters and contract pipeline for review — it makes no RPC or
// Horizon calls and submits nothing to any network. There is no `--live` mode:
// a real mainnet deploy requires a funded deployer key, an actual multi-sig
// guardian ceremony with independently-held keys, and real Soroban `deploy`/
// `invoke` calls, none of which exist here yet.

const fs = require("fs");
const path = require("path");

const MAINNET_HORIZON = "https://horizon.stellar.org";
const MAINNET_RPC = "https://soroban-rpc.mainnet.stellar.org";

function renderMainnetPlan() {
  console.log("================================================================================");
  console.log("[HIKARI] Mainnet deployment plan preview (NOT a deployment)");
  console.log("Author & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>");
  console.log("This script performs no network calls. Nothing is deployed or verified by running it.");
  console.log("================================================================================\n");

  const governancePlan = {
    threshold: "3-of-5 Multi-Sig",
    timelockLedgers: 120960, // ~7 days delay on major governance upgrades
    guardians: "TBD — real, independently-held guardian keys must be assigned before launch. Not set.",
    gateSealDuration: 120960, // 7 days emergency pause
    initialReserveFloorPct: 15,
  };

  console.log("1. Governance parameters (planned, not yet on-chain):");
  console.log(`   - Multi-Sig Policy: ${governancePlan.threshold}`);
  console.log(`   - Emergency GateSeal Window: ${governancePlan.gateSealDuration} ledgers (~7 days)`);
  console.log(`   - Timelock Upgrade Delay: ${governancePlan.timelockLedgers} ledgers`);
  console.log(`   - Guardians: ${governancePlan.guardians}\n`);

  console.log("2. Planned contract deployment order (not yet executed):");
  const pipeline = [
    { step: "1/6", contract: "Native XLM SAC Wrapper" },
    { step: "2/6", contract: "Hikari Liquid Share Token (hXLM)", symbol: "hXLM", decimals: 7 },
    { step: "3/6", contract: "Hikari Vault Core", virtualShares: 1000, virtualAssets: 1, minReservePct: 15 },
    { step: "4/6", contract: "Withdrawal Queue", cooldownLedgers: 50, batchClaimCap: 20 },
    { step: "5/6", contract: "GateSeal Circuit Breaker", pauseDuration: 120960 },
    { step: "6/6", contract: "Strategy Adapters (Blend / Phoenix / Soroswap)", maxAllocPct: 25 },
  ];
  console.table(pipeline);

  console.log("\n3. Intended agent allocation guardrails (to be enforced on-chain at launch, not active yet):");
  console.log("   - Max allocation per strategy: 25% of total assets");
  console.log("   - Slippage ceiling: 50 bps (0.50%)");
  console.log("   - Minimum liquid reserve floor: 15%");
  console.log("   - x402 daily data query budget: $1.00 USD");

  const mainnetArtifact = {
    network: "mainnet",
    passphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: MAINNET_RPC,
    horizonUrl: MAINNET_HORIZON,
    status: "NOT_DEPLOYED",
    note: "Planning preview only. No contracts deployed, no guardians assigned, no network calls made.",
    governancePlan,
    author: "ibochivincent-lang",
  };

  const outPath = path.join(__dirname, "..", "deployed_mainnet.json");
  fs.writeFileSync(outPath, JSON.stringify(mainnetArtifact, null, 2), "utf-8");
  console.log(`\nPlan preview written to: ${outPath}`);
  console.log("================================================================================\n");

  return mainnetArtifact;
}

if (require.main === module) {
  if (process.argv.includes("--live")) {
    console.error(
      "Refusing to run with --live: real mainnet deployment (funded deployer key, guardian ceremony, " +
      "Soroban deploy/invoke calls) is not implemented in this script. Remove --live to render the plan preview."
    );
    process.exit(1);
  }
  renderMainnetPlan();
}

module.exports = { renderMainnetPlan };
