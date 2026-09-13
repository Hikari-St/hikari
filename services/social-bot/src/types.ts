// Hikari Protocol: Social Bot & Telemetry Types
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

export interface ProtocolMetrics {
  tvlXlm: number;          // 485,000 XLM
  tvlUsd: number;          // 42,500 USD
  tvlMultichain: number;   // 18,400 USD
  totalValueUsd: number;   // ~121,500 USD (at ~0.125 XLM/USD)
  apyXlm: number;          // 12.4%
  apyUsd: number;          // 17.0%
  apyMultichain: number;   // 14.2%
  activeStrategies: number;
  totalVaults: number;
  lastCompoundLedger: number;
  reserveBackingRatioBps: number; // e.g. 10480 = 104.8%
}

export interface HarvestEvent {
  vault: string;
  yieldHarvested: string;
  reinvestedAssets: string;
  newApy: string;
  txHash: string;
  timestamp: string;
}

export interface RebalanceEvent {
  vault: string;
  weights: Record<string, number>; // e.g. { Blend: 40, Phoenix: 30, Soroswap: 15, Buffer: 15 }
  rationale: string;
  txHash: string;
  timestamp: string;
}

export interface SolvencyEvent {
  merkleRoot: string;
  totalLiabilities: string;
  totalReserves: string;
  reserveRatio: string;
  verifiedLedger: number;
  timestamp: string;
}

export interface SentinelAlertEvent {
  level: "WARNING" | "CRITICAL";
  vault: string;
  reason: string;
  actionTaken: string;
  timestamp: string;
}

export interface SocialBroadcastMessage {
  id: string;
  type: "HARVEST" | "REBALANCE" | "SOLVENCY" | "SENTINEL" | "MILESTONE";
  title: string;
  description: string;
  data: any;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  shares: string;
  valueUsd: number;
  loyaltyMultiplier: string;
  badge: string;
}
