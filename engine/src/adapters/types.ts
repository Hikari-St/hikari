/**
 * Hikari Protocol - Multi-Protocol Yield Adapter Architecture
 * Native Soroban Vault Adapters, Price & Route Aggregation,
 * and Settlement Liveness Verification.
 */

export interface YieldAdapterMetadata {
  protocolId: string;
  name: string;
  category: "LENDING_EMISSIONS" | "BACKSTOP_STAKING" | "CONCENTRATED_AMM" | "CONSTANT_PRODUCT_FARM" | "INDEX_VAULT";
  adapterAddress: string;
  underlyingPoolAddress: string;
  reserveAsset: "XLM" | "USDC" | "EURC";
  settlementVerified: boolean; // Native settlement verification
  livenessScore: number;       // 0 - 100
}

export interface LiveYieldBreakdown {
  baseApyBps: number;
  incentiveEmissionApyBps: number;
  mevAlphaBoostBps: number;
  totalNominalApyBps: number;
  volatilityRiskPenaltyBps: number;
  netRiskAdjustedApyBps: number;
  tvlStroops: bigint;
  lastUpdatedTimestamp: number;
}

export interface MigrationPlan {
  currentAdapterAddress: string;
  targetAdapterAddress: string;
  sourceProtocol: string;
  targetProtocol: string;
  currentApyBps: number;
  targetApyBps: number;
  yieldSpreadBps: number;
  migratableAssetsStroops: bigint;
  maxSlippageBps: number;
  projectedAnnualYieldDeltaStroops: bigint;
  settlementConfidence: string;
  atomicSorobanMethod: "migrate_adapter";
}

export interface IYieldAdapter {
  metadata: YieldAdapterMetadata;
  getLiveYield(): Promise<LiveYieldBreakdown>;
  getTotalAssets(): Promise<bigint>;
  simulateDeposit(amountStroops: bigint): Promise<{ sharesReceived: bigint; estimatedFeeStroops: bigint }>;
  simulateWithdraw(shares: bigint): Promise<{ assetsOutStroops: bigint; estimatedFeeStroops: bigint }>;
}
