import { createServer, IncomingMessage, ServerResponse } from "node:http";

export const USDC_TESTNET_SAC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const RECIPIENT_TESTNET_ACCOUNT = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export interface X402PaymentRequirement {
  version: "1.0";
  network: "stellar:testnet";
  asset: string;
  payTo: string;
  amountStroops: string;
  description: string;
}

export class PaidTelemetryServer {
  private server: ReturnType<typeof createServer>;

  constructor(private port: number = 8402) {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const paymentHeader = req.headers["x-payment"];

      // If no valid payment header, return HTTP 402 Payment Required
      if (!paymentHeader) {
        const paymentRequirement: X402PaymentRequirement = {
          version: "1.0",
          network: "stellar:testnet",
          asset: USDC_TESTNET_SAC,
          payTo: RECIPIENT_TESTNET_ACCOUNT,
          amountStroops: "10000", // 0.001 USDC
          description: "Hikari Real-Time Market Volatility & Liquidity Scoring Feed",
        };

        res.writeHead(402, {
          "Content-Type": "application/json",
          "X-Payment-Required": "true",
          "WWW-Authenticate": `x402 realm="HikariTelemetry"`,
        });
        res.end(JSON.stringify(paymentRequirement));
        return;
      }

      // If payment header present, serve premium payload
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "PAID_ACCESS_GRANTED",
          paymentProof: paymentHeader,
          data: {
            volatilityIndex: 26.4,
            projectedSlippageBps: 18,
            recommendationConfidence: 0.94,
            timestamp: Date.now(),
          },
        })
      );
    });
  }

  public listen(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => resolve());
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

export class X402Client {
  public async fetchPaidData(url: string, agentWalletSecret?: string): Promise<any> {
    // 1. Send initial request
    let res = await fetch(url);

    // 2. If 402, parse payment requirements
    if (res.status === 402) {
      const requirement = (await res.json()) as X402PaymentRequirement;

      // In real deployment, signs SAC token transfer on Stellar testnet
      const simulatedTxHash = `tx_${Date.now()}_stellar_${requirement.asset.slice(0, 6)}`;

      // 3. Retry request with payment proof
      res = await fetch(url, {
        headers: {
          "X-Payment": simulatedTxHash,
        },
      });
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch paid service: ${res.status}`);
    }

    return res.json();
  }
}

export * from "./x402_client.js";

if (typeof require !== "undefined" && require.main === module) {
  const port = parseInt(process.env.PORT || "3402", 10);
  const server = new PaidTelemetryServer(port);
  server.listen().then(() => {
    console.log(`[x402 Gateway] HTTP 402 Micropayment Server listening on port ${port}`);
  });
}

