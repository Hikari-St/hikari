import test from "node:test";
import assert from "node:assert";
import { PaidTelemetryServer, X402Client, AgentTelemetryPaymentClient } from "./index.js";
import { Keypair } from "@stellar/stellar-sdk";

test("x402 workflow: 402 challenge, payment submission, and data access", async () => {
  const port = 8499;
  const server = new PaidTelemetryServer(port);
  await server.listen();

  try {
    const client = new X402Client();
    const result = await client.fetchPaidData(`http://127.0.0.1:${port}/feed`);

    assert.strictEqual(result.status, "PAID_ACCESS_GRANTED");
    assert.strictEqual(typeof result.paymentProof, "string");
    assert.strictEqual(typeof result.data.volatilityIndex, "number");
  } finally {
    await server.close();
  }
});

test("AgentTelemetryPaymentClient handles 402 with signed USDC payment", async () => {
  const port = 8498;
  const server = new PaidTelemetryServer(port);
  await server.listen();

  try {
    const testSecret = Keypair.random().secret();
    const paymentClient = new AgentTelemetryPaymentClient(testSecret);
    const telemetry = await paymentClient.getMarketTelemetry(`http://127.0.0.1:${port}/telemetry`);

    assert.strictEqual(telemetry.status, "PAID_ACCESS_GRANTED");
    assert.strictEqual(typeof telemetry.data.volatilityIndex, "number");
    assert.strictEqual(typeof telemetry.data.projectedSlippageBps, "number");
  } finally {
    await server.close();
  }
});
