// sdk/src/types.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

export type StellarNetwork = "testnet" | "pubnet" | "custom";

export interface HikariContractsConfig {
  vaultId: string;
  tokenId: string;
  strategyRegistryId: string;
  withdrawalQueueId: string;
  policyAccountId: string;
  gateSealId: string;
  factoryId?: string;
  sentinelId?: string;
  blendAdapterId?: string;
  phoenixAdapterId?: string;
  oracleId?: string;
  governanceId?: string;
  soroswapAdapterId?: string;
  feeControllerId?: string;
}

export interface SdkConfig {
  network: StellarNetwork;
  rpcUrl: string;
  contracts: HikariContractsConfig;
  networkPassphrase?: string;
}

export interface VaultMetrics {
  totalAssetsStroops: bigint;
  totalSharesStroops: bigint;
  idleAssetsStroops: bigint;
  navPerShare: number; // e.g. 1.0428
  exchangeRateXlmPerHxlm: number;
}

export interface WithdrawalTicketInfo {
  ticketId: bigint;
  userAddress: string;
  sharesBurnedStroops: bigint;
  claimableAssetsStroops: bigint;
  unlockLedger: number;
  claimed: boolean;
  cancelled: boolean;
  status: "READY" | "IN_COOLDOWN" | "CLAIMED" | "CANCELLED";
}

export interface CircuitBreakerState {
  isGateSealed: boolean;
  isBunkerMode: boolean;
  haircutBps: number;
  currentLedger?: number;
}

export interface MevYieldSnapshot {
  totalCapturedStroops: bigint;
  totalVaultBoostStroops: bigint;
  lastSpreadBps: number;
  venues: string;
}

export interface FactoryInfo {
  admin: string;
  treasury: string;
  sentinel: string;
  totalVaults: number;
  version: string;
}

export interface SentinelStatus {
  isPaused: boolean;
  maxDrawdownBps: number;
  guardian: string;
  lastAlertTimestamp?: string;
}

export interface SocialTelemetryInfo {
  telegramStatus: string;
  discordStatus: string;
  twitterStatus: string;
  latestHarvestApy: string;
  totalCompoundedXlm: number;
  reserveRatioPercent: number;
}

export interface SolvencyProofInfo {
  merkleRoot: string;
  verifiedLedger: number;
  reserveRatioPercent: number;
  isFullySolvent: boolean;
}

export interface FeeSponsoredTxPayload {
  originalXdr: string;
  sponsorAccount: string;
  feeStroops: number;
  sponsoredEnvelopeXdr: string;
}
