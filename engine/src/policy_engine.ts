export interface RebalanceProposal {
  vaultAddress: string;
  allocations: Map<string, number>; // Strategy Address -> Basis Points (e.g., 6000 = 60%)
  estimatedSlippageBps: number;
}

export class DeterministicPolicyEngine {
  public static readonly MAX_REBALANCE_DELTA_BPS = 1500; // Max 15% allocation shift per epoch
  public static readonly MAX_SLIPPAGE_BPS = 50;          // Max 0.5% slippage
  public static readonly MIN_IDLE_CASH_BPS = 1000;       // Minimum 10% cash buffer
  private allowlistedStrategies: Set<string>;

  constructor(allowlist: string[]) {
    this.allowlistedStrategies = new Set(allowlist);
  }

  public getAllowlist(): string[] {
    return Array.from(this.allowlistedStrategies);
  }

  public isAllowlisted(strategy: string): boolean {
    return this.allowlistedStrategies.has(strategy);
  }

  public validateProposal(
    currentAllocations: Map<string, number>,
    proposal: RebalanceProposal
  ): boolean {
    // 1. Check all target contracts are allowlisted
    for (const [strategy] of proposal.allocations) {
      if (!this.allowlistedStrategies.has(strategy)) {
        throw new Error(`Security Exception: Strategy ${strategy} is not allowlisted!`);
      }
    }

    // 2. Enforce slippage cap
    if (proposal.estimatedSlippageBps > DeterministicPolicyEngine.MAX_SLIPPAGE_BPS) {
      throw new Error(
        `Risk Violation: Slippage ${proposal.estimatedSlippageBps} bps exceeds max limit`
      );
    }

    // 3. Enforce delta velocity limit
    for (const [strategy, targetBps] of proposal.allocations) {
      const currentBps = currentAllocations.get(strategy) || 0;
      const delta = Math.abs(targetBps - currentBps);
      if (delta > DeterministicPolicyEngine.MAX_REBALANCE_DELTA_BPS) {
        throw new Error(
          `Velocity Violation: Shift in ${strategy} of ${delta} bps exceeds 15% limit`
        );
      }
    }

    // 4. Enforce minimum idle cash buffer (at least 10% / 1000 bps)
    const idleKeys = Array.from(proposal.allocations.keys()).filter(
      (k) =>
        k.toLowerCase() === "idle" ||
        k === proposal.vaultAddress ||
        k.toLowerCase().includes("idle")
    );
    if (idleKeys.length > 0) {
      const totalIdle = idleKeys.reduce(
        (acc, k) => acc + (proposal.allocations.get(k) || 0),
        0
      );
      if (totalIdle < DeterministicPolicyEngine.MIN_IDLE_CASH_BPS) {
        throw new Error(
          `Liquidity Violation: Idle cash buffer ${totalIdle} bps is below minimum ${DeterministicPolicyEngine.MIN_IDLE_CASH_BPS} bps (10%)`
        );
      }
    }

    // 5. Validate sum of weights = 10,000 basis points
    let totalBps = 0;
    for (const [, bps] of proposal.allocations) {
      totalBps += bps;
    }
    if (totalBps !== 10000) {
      throw new Error(`Math Error: Allocations must sum to 10000 bps (got ${totalBps})`);
    }

    return true;
  }
}
