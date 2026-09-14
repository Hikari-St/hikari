// sdk/src/contract-reader.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Live Soroban RPC contract reader — reads real on-chain state via simulateTransaction

import {
  rpc,
  Contract,
  Account,
  TransactionBuilder,
  Networks,
  scValToNative,
} from "@stellar/stellar-sdk";

const DUMMY_ACCOUNT_ID = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export interface OracleTelemetryData {
  navStroops: bigint;
  aprBps: number;
  totalReserves: bigint;
  liquidReserveRatioBps: number;
  bunkerActive: boolean;
  lastUpdatedLedger: number;
  proofHash: string;
}

export interface GateSealStatusData {
  isSealed: boolean;
  sealedAtLedger: number;
  durationLedgers: number;
}

export interface GovernanceProposalData {
  id: number;
  creator: string;
  title: string;
  descriptionHash: string;
  targetContract: string;
  actionId: number;
  paramValue: bigint;
  startLedger: number;
  endLedger: number;
  etaLedger: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  vetoVotes: bigint;
  state: string;
}

export interface GovernanceConfigData {
  admin: string;
  hxlmToken: string;
  votingPeriodLedgers: number;
  timelockLedgers: number;
  quorumBps: number;
  vetoThresholdBps: number;
}

// Simple in-memory cache entry
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ContractReader {
  private server: rpc.Server;
  private networkPassphrase: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTtlMs: number;

  constructor(
    rpcUrl: string = "https://soroban-testnet.stellar.org",
    networkPassphrase: string = "Test SDF Network ; September 2015",
    cacheTtlMs: number = 5000
  ) {
    this.server = new rpc.Server(rpcUrl);
    this.networkPassphrase = networkPassphrase;
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Low-level: simulate a read-only contract call and return the native-decoded result.
   */
  private async simulateCall<T>(contractId: string, functionName: string, args: any[] = []): Promise<T> {
    const cacheKey = `${contractId}:${functionName}:${JSON.stringify(args)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    const contract = new Contract(contractId);
    const dummyAccount = new Account(DUMMY_ACCOUNT_ID, "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new Error(
        `Contract read failed: ${contractId}.${functionName}() — simulation did not return a success result`
      );
    }

    const result = scValToNative(sim.result.retval) as T;

    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  // ─── Vault Reads ───────────────────────────────────────────────

  public async readVaultTotalAssets(vaultId: string): Promise<bigint> {
    const raw = await this.simulateCall<any>(vaultId, "total_assets");
    return typeof raw === "bigint" ? raw : BigInt(raw);
  }

  public async readVaultTotalShares(vaultId: string): Promise<bigint> {
    const raw = await this.simulateCall<any>(vaultId, "total_shares");
    return typeof raw === "bigint" ? raw : BigInt(raw);
  }

  // ─── Oracle Reads ──────────────────────────────────────────────

  public async readOracleTelemetry(oracleId: string): Promise<OracleTelemetryData> {
    const raw = await this.simulateCall<any>(oracleId, "get_telemetry");

    // scValToNative converts Soroban structs to plain JS objects with snake_case keys
    return {
      navStroops: typeof raw.nav_stroops === "bigint" ? raw.nav_stroops : BigInt(raw.nav_stroops || 0),
      aprBps: Number(raw.apr_bps || 0),
      totalReserves: typeof raw.total_reserves === "bigint" ? raw.total_reserves : BigInt(raw.total_reserves || 0),
      liquidReserveRatioBps: Number(raw.liquid_reserve_ratio_bps || 0),
      bunkerActive: Boolean(raw.bunker_active),
      lastUpdatedLedger: Number(raw.last_updated_ledger || 0),
      proofHash: raw.proof_hash
        ? Buffer.from(raw.proof_hash).toString("hex")
        : "0".repeat(64),
    };
  }

  public async readOracleNav(oracleId: string): Promise<bigint> {
    const raw = await this.simulateCall<any>(oracleId, "get_hxlm_nav");
    return typeof raw === "bigint" ? raw : BigInt(raw);
  }

  public async readOracleApr(oracleId: string): Promise<number> {
    const raw = await this.simulateCall<any>(oracleId, "get_average_apr");
    return Number(raw);
  }

  // ─── GateSeal Reads ────────────────────────────────────────────

  public async readGateSealStatus(gateSealId: string): Promise<GateSealStatusData> {
    // get_seal_status returns a tuple (bool, u32, u32)
    const raw = await this.simulateCall<any>(gateSealId, "get_seal_status");

    // scValToNative converts tuples to arrays
    if (Array.isArray(raw)) {
      return {
        isSealed: Boolean(raw[0]),
        sealedAtLedger: Number(raw[1] || 0),
        durationLedgers: Number(raw[2] || 0),
      };
    }

    // Fallback if it comes back as an object
    return {
      isSealed: Boolean(raw.is_sealed ?? raw[0] ?? false),
      sealedAtLedger: Number(raw.sealed_at_ledger ?? raw[1] ?? 0),
      durationLedgers: Number(raw.duration_ledgers ?? raw[2] ?? 0),
    };
  }

  public async readIsSealed(gateSealId: string): Promise<boolean> {
    return this.simulateCall<boolean>(gateSealId, "is_sealed");
  }

  // ─── Governance Reads ──────────────────────────────────────────

  public async readGovernanceProposalCount(governanceId: string): Promise<number> {
    const raw = await this.simulateCall<any>(governanceId, "get_proposal_count");
    return Number(raw);
  }

  public async readGovernanceProposal(
    governanceId: string,
    proposalId: number
  ): Promise<GovernanceProposalData> {
    const { nativeToScVal } = await import("@stellar/stellar-sdk");
    const raw = await this.simulateCall<any>(
      governanceId,
      "get_proposal",
      [nativeToScVal(proposalId, { type: "u32" })]
    );

    // Map ProposalState enum values
    const stateMap: Record<number, string> = {
      0: "Pending",
      1: "Active",
      2: "Queued",
      3: "Executed",
      4: "Defeated",
      5: "Vetoed",
    };

    return {
      id: Number(raw.id || 0),
      creator: String(raw.creator || ""),
      title: String(raw.title || ""),
      descriptionHash: raw.description_hash
        ? Buffer.from(raw.description_hash).toString("hex")
        : "0".repeat(64),
      targetContract: String(raw.target_contract || ""),
      actionId: Number(raw.action_id || 0),
      paramValue: typeof raw.param_value === "bigint" ? raw.param_value : BigInt(raw.param_value || 0),
      startLedger: Number(raw.start_ledger || 0),
      endLedger: Number(raw.end_ledger || 0),
      etaLedger: Number(raw.eta_ledger || 0),
      forVotes: typeof raw.for_votes === "bigint" ? raw.for_votes : BigInt(raw.for_votes || 0),
      againstVotes: typeof raw.against_votes === "bigint" ? raw.against_votes : BigInt(raw.against_votes || 0),
      abstainVotes: typeof raw.abstain_votes === "bigint" ? raw.abstain_votes : BigInt(raw.abstain_votes || 0),
      vetoVotes: typeof raw.veto_votes === "bigint" ? raw.veto_votes : BigInt(raw.veto_votes || 0),
      state: typeof raw.state === "number" ? (stateMap[raw.state] || "Unknown") : String(raw.state || "Unknown"),
    };
  }

  public async readGovernanceConfig(governanceId: string): Promise<GovernanceConfigData> {
    const raw = await this.simulateCall<any>(governanceId, "get_config");

    return {
      admin: String(raw.admin || ""),
      hxlmToken: String(raw.hxlm_token || ""),
      votingPeriodLedgers: Number(raw.voting_period_ledgers || 0),
      timelockLedgers: Number(raw.timelock_ledgers || 0),
      quorumBps: Number(raw.quorum_bps || 0),
      vetoThresholdBps: Number(raw.veto_threshold_bps || 0),
    };
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
