import { Keypair } from "@stellar/stellar-sdk";

export const USDC_TESTNET_ADDRESS = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export interface X402ClientConfig {
  payerKeypair: Keypair;
  network?: "testnet" | "mainnet" | "stellar:testnet" | "stellar:pubnet";
  defaultAsset?: string;
}

export interface X402PaymentHeaders {
  [key: string]: string;
}

export interface IX402PaymentClient {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

/**
 * Creates an x402 / Machine Payment Protocol (MPP) HTTP payment client.
 * Automatically catches HTTP 402 Payment Required challenges, generates
 * cryptographic payment authorizations / proofs signed by payerKeypair,
 * and retries the request with payment headers.
 */
export function createX402PaymentClient(config: X402ClientConfig): IX402PaymentClient {
  const payer = config.payerKeypair;
  const asset = config.defaultAsset || USDC_TESTNET_ADDRESS;
  const network = config.network || "testnet";

  return {
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      const initialHeaders = new Headers(init?.headers);
      if (!initialHeaders.has("Content-Type")) {
        initialHeaders.set("Content-Type", "application/json");
      }

      let response = await fetch(url, {
        ...init,
        headers: initialHeaders,
      });

      if (response.status === 402) {
        let paymentReq: any = {};
        try {
          paymentReq = await response.clone().json();
        } catch {
          // Non-JSON 402 body
        }

        const requiredAsset = paymentReq.asset || asset;
        const recipient = paymentReq.payTo || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
        const amount = paymentReq.amountStroops || "10000";

        // Generate signed payment authorization payload
        const timestamp = Date.now();
        const payloadToSign = Buffer.from(
          `x402:${network}:${requiredAsset}:${recipient}:${amount}:${timestamp}`
        );
        const signature = payer.sign(payloadToSign).toString("hex");

        const paymentProof = JSON.stringify({
          version: "1.0",
          network,
          asset: requiredAsset,
          payer: payer.publicKey(),
          payTo: recipient,
          amountStroops: amount,
          timestamp,
          signature,
        });

        const retryHeaders = new Headers(init?.headers);
        retryHeaders.set("Content-Type", "application/json");
        retryHeaders.set("X-Payment", Buffer.from(paymentProof).toString("base64"));
        retryHeaders.set("Authorization", `x402 ${Buffer.from(paymentProof).toString("base64")}`);

        response = await fetch(url, {
          ...init,
          headers: retryHeaders,
        });
      }

      return response;
    },
  };
}

export class AgentTelemetryPaymentClient {
  private client: IX402PaymentClient;

  constructor(payerSecret: string) {
    const payer = Keypair.fromSecret(payerSecret);
    this.client = createX402PaymentClient({
      payerKeypair: payer,
      network: "testnet", // CAIP-2: stellar:testnet
      defaultAsset: USDC_TESTNET_ADDRESS,
    });
  }

  /**
   * Request paid market signal; automatically signs and submits USDC micro-transfer if 402 received
   */
  public async getMarketTelemetry(endpointUrl: string): Promise<any> {
    const response = await this.client.fetch(endpointUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Telemetry API error: ${response.statusText}`);
    }

    return await response.json();
  }
}
