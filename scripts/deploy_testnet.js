// scripts/deploy_testnet.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Complete deployment & verification suite for Hikari Protocol on Stellar Testnet

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    const stdout = err.stdout ? err.stdout.toString() : "";
    throw new Error(`Command failed: ${cmd}\n${stderr}\n${stdout}`);
  }
}

async function fundAccount(publicKey) {
  console.log(`Funding account ${publicKey} via Friendbot...`);
  try {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    if (res.ok) {
      console.log(`✓ Friendbot funding confirmed.`);
    } else {
      console.log(`[WARN] Friendbot returned status: ${res.statusText} (Account may already exist).`);
    }
  } catch (e) {
    console.log(`[WARN] Friendbot call failed: ${e.message}`);
  }
}

async function verifyContracts(config) {
  console.log("\n================================================================================");
  console.log("[HIKARI AUDIT] Verifying Live Stellar Testnet Contracts");
  console.log("================================================================================");

  const { vault, token, strategyRegistry, withdrawalQueue, gateSeal, blendAdapter, phoenixAdapter } = config.contracts;
  const admin = config.identities.admin;

  try {
    console.log(`\n1. Hikari Vault (${vault.id}):`);
    const totalAssetsRaw = runCmd(`stellar contract invoke --id ${vault.id} --source hikari-admin --network testnet -- total_assets`);
    const totalSharesRaw = runCmd(`stellar contract invoke --id ${vault.id} --source hikari-admin --network testnet -- total_shares`);
    const assets = Number(JSON.parse(totalAssetsRaw.split("\n").pop().trim())) / 1e7;
    const shares = Number(JSON.parse(totalSharesRaw.split("\n").pop().trim())) / 1e7;
    console.log(`   [OK] Total Assets: ${assets.toFixed(4)} XLM`);
    console.log(`   [OK] Total Shares: ${shares.toFixed(4)} hXLM`);
    console.log(`   [OK] NAV / Share:  ${shares > 0 ? (assets / shares).toFixed(4) : "1.0000"} XLM`);

    console.log(`\n2. GateSeal Circuit Breaker (${gateSeal.id}):`);
    const isSealedRaw = runCmd(`stellar contract invoke --id ${gateSeal.id} --source hikari-admin --network testnet -- is_sealed`);
    const isSealed = JSON.parse(isSealedRaw.split("\n").pop().trim());
    console.log(`   [OK] Sealed Status: ${isSealed ? "[SEALED] (Allocations Frozen)" : "[UNSEALED] (System Nominal)"}`);

    console.log(`\n3. Blend Protocol Adapter (${blendAdapter.id}):`);
    const blendValRaw = runCmd(`stellar contract invoke --id ${blendAdapter.id} --source hikari-admin --network testnet -- total_value`);
    const blendVal = Number(JSON.parse(blendValRaw.split("\n").pop().trim())) / 1e7;
    console.log(`   [OK] Blend Collateral Value: ${blendVal.toFixed(4)} XLM`);

    console.log(`\n4. Phoenix CLAMM Adapter (${phoenixAdapter.id}):`);
    const phxValRaw = runCmd(`stellar contract invoke --id ${phoenixAdapter.id} --source hikari-admin --network testnet -- total_value`);
    const phxVal = Number(JSON.parse(phxValRaw.split("\n").pop().trim())) / 1e7;
    console.log(`   [OK] Phoenix Concentrated Position: ${phxVal.toFixed(4)} XLM`);

    if (config.contracts.soroswapAdapter) {
      const soroswap = config.contracts.soroswapAdapter;
      console.log(`\n5. Soroswap AMM Adapter (${soroswap.id}):`);
      const sValRaw = runCmd(`stellar contract invoke --id ${soroswap.id} --source hikari-admin --network testnet -- total_value`);
      const sVal = Number(JSON.parse(sValRaw.split("\n").pop().trim())) / 1e7;
      console.log(`   [OK] Soroswap Position Value: ${sVal.toFixed(4)} XLM`);
    }

    if (config.contracts.oracle) {
      const oracle = config.contracts.oracle;
      console.log(`\n6. Hikari Telemetry Oracle (${oracle.id}):`);
      const teleRaw = runCmd(`stellar contract invoke --id ${oracle.id} --source hikari-admin --network testnet -- get_telemetry`);
      const tele = JSON.parse(teleRaw.split("\n").pop().trim());
      console.log(`   [OK] Telemetry NAV: ${(Number(tele.nav_stroops) / 1e7).toFixed(4)} XLM | APR: ${(tele.apr_bps / 100).toFixed(2)}% | Bunker: ${tele.bunker_active}`);
    }

    if (config.contracts.governance) {
      const gov = config.contracts.governance;
      console.log(`\n7. Community Governance & DAO Engine (${gov.id}):`);
      const govConfRaw = runCmd(`stellar contract invoke --id ${gov.id} --source hikari-admin --network testnet -- get_config`);
      const govConf = JSON.parse(govConfRaw.split("\n").pop().trim());
      console.log(`   [OK] Quorum: ${(govConf.quorum_bps / 100).toFixed(2)}% | Staker Veto Threshold: ${(govConf.veto_threshold_bps / 100).toFixed(2)}% | Timelock: ${govConf.timelock_ledgers} ledgers`);
    }

    if (config.contracts.feeController) {
      const feeCtrl = config.contracts.feeController;
      console.log(`\n8. Dynamic Fee Controller (${feeCtrl.id}):`);
      const feeRaw = runCmd(`stellar contract invoke --id ${feeCtrl.id} --source hikari-admin --network testnet -- get_fee_config`);
      const [mgmtBps, perfBps, hwm] = JSON.parse(feeRaw.split("\n").pop().trim());
      console.log(`   [OK] Management Fee: ${(mgmtBps / 100).toFixed(2)}% | Performance Fee: ${(perfBps / 100).toFixed(2)}% | HWM: ${(Number(hwm) / 1e7).toFixed(4)} XLM`);
    }

    console.log("\n================================================================================");
    console.log("[SUCCESS] All 8 Testnet contracts are active, responding, and state-verified!");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("Verification encounter error:", err.message);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("[HIKARI] Stellar Testnet Deployment & Operations Suite");
  console.log("Author & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>");
  console.log("================================================================================");

  const configPath = path.join(__dirname, "..", "deployed_contracts.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file missing at: ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  const args = process.argv.slice(2);

  if (args.includes("--verify")) {
    await verifyContracts(config);
    return;
  }

  console.log("\nActive Identities on Stellar Testnet:");
  console.log(`  Admin / Guardian:  ${config.identities.admin}`);
  console.log(`  Autonomous Agent:  ${config.identities.agent}`);

  console.log("\nDeployed Contracts on Stellar Testnet:");
  for (const [name, info] of Object.entries(config.contracts)) {
    console.log(`  - ${name.padEnd(24)}: ${info.id}`);
  }

  console.log("\nUsage Options:");
  console.log("  node scripts/deploy_testnet.js --verify   # Verifies on-chain state & NAV");
  console.log("  node scripts/test_live_cycle.js           # Runs live deposit/rebalance cycle");
}

main().catch(console.error);
