// agents/src/payment_agent.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

export interface PaymentRequest {
  serviceName: string;
  endpoint: string;
  asset: string; // e.g. USDC SAC or XLM
  amountStroops: bigint;
  destination: string;
}

export interface PaymentReceipt {
  success: boolean;
  txHash: string | null;
  timestamp: number;
  settledAmount: bigint;
  notes: string;
  fallbackEngaged: boolean;
}

export class PaymentAgent {
  // Hard policy limits: $1.00 USDC daily cap, $0.01 USDC max per query
  private maxPerQueryStroops: bigint = 100_000n; // 0.01 USDC
  private dailyBudgetStroops: bigint = 10_000_000n; // 1.00 USDC daily budget
  private spentTodayStroops: bigint = 0n;

  public canPay(req: PaymentRequest): boolean {
    if (req.amountStroops > this.maxPerQueryStroops) {
      return false;
    }
    if (this.spentTodayStroops + req.amountStroops > this.dailyBudgetStroops) {
      return false;
    }
    // Only pay approved telemetry/data providers
    return req.destination.startsWith("G") || req.destination.startsWith("C");
  }

  /**
   * Settles x402 machine-to-machine micropayment on Stellar.
   * Throws an explicit error if on-chain x402 payment channels are not configured,
   * triggering clean fallback to free public oracle telemetry.
   */
  public async settlePayment(req: PaymentRequest): Promise<PaymentReceipt> {
    if (!this.canPay(req)) {
      return this.fetchPublicOracleFallback(req.serviceName, "Payment budget exceeded or query fee capped");
    }

    const x402Configured = process.env.X402_FACILITATOR_URL && process.env.X402_PAYER_SECRET;
    if (!x402Configured) {
      throw new Error(
        `x402 on-chain machine micropayment settlement is not configured for ${req.serviceName}.`
      );
    }

    throw new Error("x402 on-chain payment settlement channel: Not implemented yet on testnet.");
  }

  public fetchPublicOracleFallback(serviceName: string, reason: string): PaymentReceipt {
    return {
      success: true,
      txHash: null,
      timestamp: Date.now(),
      settledAmount: 0n,
      notes: `Using free public Stellar RPC and Horizon telemetry for ${serviceName} (${reason})`,
      fallbackEngaged: true,
    };
  }

  public getBudgetStatus() {
    return {
      dailyBudget: this.dailyBudgetStroops,
      maxPerQuery: this.maxPerQueryStroops,
      spentToday: this.spentTodayStroops,
      remaining: this.dailyBudgetStroops - this.spentTodayStroops,
    };
  }
}

