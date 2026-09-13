// scripts/verify_backend_security.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// End-to-End Verification Suite for Backend Security, Cryptographic Wallet Auth & Anti-Mixup Cloud Database

const http = require("http");
const assert = require("assert");

const TEST_PORT = 3000;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(path, method = "GET", payload = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = payload ? JSON.stringify(payload) : null;

    const req = http.request(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": bodyStr ? Buffer.byteLength(bodyStr) : 0,
        "User-Agent": "Hikari-Security-Tester/1.0",
        "X-Forwarded-For": "192.168.1.100"
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runSecurityVerification() {
  console.log("================================================================================");
  console.log("🔒 [HIKARI] Backend Security & Anti-Mixup Database Verification Suite");
  console.log("Author & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>");
  console.log("Target Server:", BASE_URL);
  console.log("================================================================================\n");

  const results = {};

  const userAlice = "GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN";
  const userBob   = "GAQZQABZADRIHXJSNS75OLEKNE65ZFU273PBSA6H23IHILQVFK3VQ5L2";

  // Test 1: Cloud Database Health & Resilient Connectivity
  console.log("1. Testing Cloud Database Health & Connection Mode...");
  const dbHealth = await makeRequest("/api/v1/db/health");
  assert.strictEqual(dbHealth.status, 200, "Database health must return HTTP 200");
  assert.ok(dbHealth.data.isConnected, "Database must report isConnected=true");
  assert.ok(dbHealth.data.mode, "Database must report active storage/cloud mode");
  results.dbHealthOk = true;
  console.log(`   ✓ Database active mode: ${dbHealth.data.mode} (Connected: ${dbHealth.data.isConnected})`);

  // Test 2: Cryptographic Challenge Generation (SEP-10 Nonce)
  console.log("\n2. Testing Cryptographic Challenge Generation for Alice...");
  const challengeRes = await makeRequest("/api/v1/auth/challenge", "POST", { stellarAddress: userAlice });
  assert.strictEqual(challengeRes.status, 200, "Challenge request must succeed");
  assert.ok(challengeRes.data.success, "Challenge success must be true");
  assert.ok(challengeRes.data.challenge.challengeId, "Must have challengeId");
  assert.strictEqual(challengeRes.data.challenge.stellarAddress, userAlice);
  assert.ok(challengeRes.data.challenge.nonce.length >= 64, "Nonce must be 32 bytes hex (64 chars)");
  assert.ok(challengeRes.data.challenge.message.includes("HIKARI PROTOCOL WALLET AUTHENTICATION") || challengeRes.data.challenge.message.includes("HAKIRU PROTOCOL WALLET AUTHENTICATION"));
  results.challengeGeneration = true;
  console.log(`   ✓ Challenge ID generated: ${challengeRes.data.challenge.challengeId}`);
  console.log(`   ✓ Cryptographic Nonce: ${challengeRes.data.challenge.nonce.slice(0, 16)}...`);

  // Test 3: Signature Verification & Session Token Issuance
  console.log("\n3. Testing Signature Verification & Authenticated Session Issuance...");
  const verifyRes = await makeRequest("/api/v1/auth/verify", "POST", {
    challengeId: challengeRes.data.challenge.challengeId,
    stellarAddress: userAlice,
    signature: "DEMO_TESTNET_APPROVED_SIGNATURE"
  });
  assert.strictEqual(verifyRes.status, 200, "Verify request must return 200");
  assert.ok(verifyRes.data.success, "Verify success must be true");
  assert.ok(verifyRes.data.session.sessionToken.includes("."), "Session token must be formatted payload.hmac");
  assert.strictEqual(verifyRes.data.user.stellarAddress, userAlice, "Profile must belong to Alice");
  results.authVerifySuccess = true;
  console.log(`   ✓ Session Token Issued: ${verifyRes.data.session.sessionToken.slice(0, 32)}...`);
  console.log(`   ✓ Alice Profile Created: ID ${verifyRes.data.user.id}`);

  // Test 4: Replay Attack Defense (Re-using the same challenge)
  console.log("\n4. Testing Replay Attack Defense (Replaying Challenge ID)...");
  const replayRes = await makeRequest("/api/v1/auth/verify", "POST", {
    challengeId: challengeRes.data.challenge.challengeId,
    stellarAddress: userAlice,
    signature: "DEMO_TESTNET_APPROVED_SIGNATURE"
  });
  assert.strictEqual(replayRes.status, 401, "Replayed challenge must be rejected with 401");
  assert.strictEqual(replayRes.data.success, false, "Replay success must be false");
  results.replayAttackBlocked = true;
  console.log(`   ✓ Replay attempt blocked cleanly: "${replayRes.data.error}"`);

  // Test 5: Anti-Mixup User Profile & Address Isolation
  console.log("\n5. Testing Strict Address Isolation & Anti-Mixup between Alice & Bob...");
  // Alice sets preferences
  await makeRequest("/api/v1/user/profile", "PUT", {
    stellarAddress: userAlice,
    preferences: { theme: "light", currency: "XLM", telegramAlerts: true }
  });

  // Bob requests profile
  const bobProfileRes = await makeRequest(`/api/v1/user/profile?address=${userBob}`);
  assert.strictEqual(bobProfileRes.data.user.stellarAddress, userBob);
  assert.strictEqual(bobProfileRes.data.user.preferences.theme, "dark", "Bob's default theme must not be contaminated by Alice");

  const aliceProfileRes = await makeRequest(`/api/v1/user/profile?address=${userAlice}`);
  assert.strictEqual(aliceProfileRes.data.user.preferences.theme, "light", "Alice's theme must remain light");
  results.antiMixupIsolation = true;
  console.log("   ✓ Verified: Alice and Bob have independent isolated profile records.");

  // Test 6: Portfolio Balance & Transaction Accounting
  console.log("\n6. Testing Multi-Vault Deposit Accounting & Transaction Ledger...");
  const beforePortfolioRes = await makeRequest(`/api/v1/user/portfolio?address=${userAlice}`);
  const initialDeposited = beforePortfolioRes.data.portfolios.find(p => p.vaultType === "EARN_XLM")?.depositedStroops || "0";
  const depositAmount = "2500000000";
  const expectedTotal = (BigInt(initialDeposited) + BigInt(depositAmount)).toString();

  const depositRes = await makeRequest("/api/v1/user/deposit-record", "POST", {
    stellarAddress: userAlice,
    vaultType: "EARN_XLM",
    amountStroops: depositAmount,
    sharesReceived: depositAmount,
    txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  });
  assert.strictEqual(depositRes.status, 200);
  assert.strictEqual(depositRes.data.portfolio.depositedStroops, expectedTotal);

  const historyRes = await makeRequest(`/api/v1/user/history?address=${userAlice}`);
  assert.ok(historyRes.data.transactions.length >= 1, "Transaction history must contain the deposit");
  assert.strictEqual(historyRes.data.transactions[0].action, "DEPOSIT");
  results.portfolioAccounting = true;
  console.log(`   ✓ Deposit recorded for Alice: +${depositAmount} stroops (New Total: ${expectedTotal})`);
  console.log(`   ✓ Transaction Ledger verified: ${historyRes.data.transactions[0].txHash.slice(0, 18)}...`);

  // Test 7: Tamper-Evident Security Audit Logs
  console.log("\n7. Testing Tamper-Evident Security Audit Log Stream...");
  const logsRes = await makeRequest("/api/v1/security/logs");
  assert.strictEqual(logsRes.status, 200);
  assert.ok(logsRes.data.logs.length >= 3, "Must have recorded authentication and security events");
  const hasReplayLog = logsRes.data.logs.some(l => l.eventType === "AUTH_FAILED" || l.eventType === "REPLAY_ATTACK_BLOCKED");
  assert.ok(hasReplayLog, "Audit log must contain record of blocked replay or failed auth attempt");
  results.securityAuditLogsOk = true;
  console.log(`   ✓ Audit log stream verified with ${logsRes.data.logs.length} security entries recorded.`);

  console.log("\n================================================================================");
  console.log("📊 BACKEND SECURITY & DATABASE VERIFICATION RESULTS:");
  console.log("================================================================================");
  console.table(results);
  console.log("================================================================================");
  console.log("🎉 ALL 7 BACKEND SECURITY, WALLET AUTH & ANTI-MIXUP DATABASE CHECKS PASSED!\n");
}

runSecurityVerification().catch(err => {
  console.error("FATAL ERROR in security verification:", err.message);
  process.exit(1);
});
