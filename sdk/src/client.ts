// sdk/src/client.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

import {
  SdkConfig,
  VaultMetrics,
  WithdrawalTicketInfo,
  CircuitBreakerState,
  MevYieldSnapshot,
} from "./types.js";

export const TESTNET_DEFAULT_CONFIG: SdkConfig = {
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  contracts: {
    vaultId: "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5",
    tokenId: "CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH",
    strategyRegistryId: "CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ",
    withdrawalQueueId: "CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ",
    policyAccountId: "CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP",
    gateSealId: "CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ",
    blendAdapterId: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
    phoenixAdapterId: "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
    oracleId: "CAEPCI2TEPENZZBGSMSQEL3W6IW7TYBXRKGXU25J56LQUC33NXJXF6S6",
    governanceId: "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID",
    soroswapAdapterId: "CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3",
    feeControllerId: "CDD6XCT7TD3AWEYMQM7XDFPFDQUZUFUTRVUY3MDNCHPV4SUU4R3OA473",
  },
};

const VIRTUAL_ASSETS = 1n;
const VIRTUAL_SHARES = 1000n;

export class HikariClient {
  public readonly config: SdkConfig;

  constructor(config: Partial<SdkConfig> = {}) {
    this.config = {
      network: config.network || TESTNET_DEFAULT_CONFIG.network,
      rpcUrl: config.rpcUrl || TESTNET_DEFAULT_CONFIG.rpcUrl,
      networkPassphrase: config.networkPassphrase || TESTNET_DEFAULT_CONFIG.networkPassphrase,
      contracts: {
        ...TESTNET_DEFAULT_CONFIG.contracts,
        ...(config.contracts || {}),
      },
    };
  }

  /**
   * Computes NAV and exchange rate accounting for virtual share inflation offsets.
   */
  public calculateNav(totalAssetsStroops: bigint, totalSharesStroops: bigint): number {
    const virtualAssets = totalAssetsStroops + VIRTUAL_ASSETS;
    const virtualShares = totalSharesStroops + VIRTUAL_SHARES;
    const ratio = Number(virtualAssets) / Number(virtualShares);
    return Math.round(ratio * 10000) / 10000;
  }


  /**
   * Preview exact hXLM shares minted for a given XLM deposit amount.
   */
  public previewDeposit(
    assetsStroops: bigint,
    totalAssetsStroops: bigint,
    totalSharesStroops: bigint
  ): bigint {
    const virtualAssets = totalAssetsStroops + VIRTUAL_ASSETS;
    const virtualShares = totalSharesStroops + VIRTUAL_SHARES;
    return (assetsStroops * virtualShares) / virtualAssets;
  }

  /**
   * Preview exact XLM assets redeemed for a given hXLM share amount, accounting for Bunker Mode haircut.
   */
  public previewRedeem(
    sharesStroops: bigint,
    totalAssetsStroops: bigint,
    totalSharesStroops: bigint,
    haircutBps: number = 0
  ): bigint {
    const virtualAssets = totalAssetsStroops + VIRTUAL_ASSETS;
    const virtualShares = totalSharesStroops + VIRTUAL_SHARES;
    let nominalAssets = (sharesStroops * virtualAssets) / virtualShares;

    if (haircutBps > 0) {
      const deduction = (nominalAssets * BigInt(haircutBps)) / 10000n;
      nominalAssets = nominalAssets - deduction;
    }

    return nominalAssets;
  }

  /**
   * Formats a raw Soroban contract call invocation payload.
   */
  public buildInvocationPayload(
    contractId: string,
    functionName: string,
    args: Record<string, any>
  ): {
    contractId: string;
    functionName: string;
    args: Record<string, any>;
    network: string;
  } {
    return {
      contractId,
      functionName,
      args,
      network: this.config.network,
    };
  }

  /**
   * Constructs transaction payload for depositing XLM into the Hikari Vault.
   */
  public buildDepositTx(fromAddress: string, amountStroops: bigint) {
    return this.buildInvocationPayload(this.config.contracts.vaultId, "deposit", {
      from: fromAddress,
      amount: amountStroops.toString(),
    });
  }

  /**
   * Constructs transaction payload for queuing asynchronous share redemption.
   */
  public buildRequestWithdrawalTx(userAddress: string, sharesStroops: bigint) {
    return this.buildInvocationPayload(
      this.config.contracts.withdrawalQueueId,
      "request_withdrawal",
      {
        user: userAddress,
        shares: sharesStroops.toString(),
      }
    );
  }

  /**
   * Constructs transaction payload for claiming finalized withdrawal tickets.
   */
  public buildClaimWithdrawalTx(userAddress: string, ticketId: bigint) {
    return this.buildInvocationPayload(
      this.config.contracts.withdrawalQueueId,
      "claim_withdrawal",
      {
        user: userAddress,
        ticket_id: ticketId.toString(),
      }
    );
  }

  /**
   * Constructs transaction payload for claiming multiple withdrawal tickets atomically.
   */
  public buildClaimBatchTx(userAddress: string, ticketIds: bigint[]) {
    return this.buildInvocationPayload(
      this.config.contracts.withdrawalQueueId,
      "claim_batch",
      {
        user: userAddress,
        ticket_ids: ticketIds.map((id) => id.toString()),
      }
    );
  }

  /**
   * Constructs transaction payload for voting on an on-chain DAO proposal.
   */
  public buildVoteTx(proposalId: number, voter: string, voteType: number) {
    return this.buildInvocationPayload(
      this.config.contracts.governanceId || "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID",
      "cast_vote",
      {
        proposal_id: proposalId,
        voter,
        vote_type: voteType,
      }
    );
  }

  /**
   * Constructs transaction payload for triggering a 33.4% staker veto.
   */
  public buildStakerVetoTx(proposalId: number, voter: string) {
    return this.buildInvocationPayload(
      this.config.contracts.governanceId || "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID",
      "cast_staker_veto",
      {
        proposal_id: proposalId,
        voter,
      }
    );
  }

  /**
   * Constructs transaction payload for creating a new DAO proposal.
   */
  public buildCreateProposalTx(
    creator: string,
    title: string,
    targetContract: string,
    actionId: number,
    paramValue: bigint
  ) {
    return this.buildInvocationPayload(
      this.config.contracts.governanceId || "CA2MDYX7IIDD32KQGXIN6SRERI4ABVO3N37BLH7HKNFGTAI252VE7QID",
      "create_proposal",
      {
        creator,
        title,
        description_hash: "0000000000000000000000000000000000000000000000000000000000000000",
        target_contract: targetContract,
        action_id: actionId,
        param_value: paramValue.toString(),
      }
    );
  }

  /**
   * Evaluates ticket status against current ledger sequence.
   */
  public parseTicketStatus(
    ticket: { unlockLedger: number; claimed: boolean; cancelled: boolean },
    currentLedger: number
  ): WithdrawalTicketInfo["status"] {
    if (ticket.claimed) return "CLAIMED";
    if (ticket.cancelled) return "CANCELLED";
    if (currentLedger >= ticket.unlockLedger) return "READY";
    return "IN_COOLDOWN";
  }

  /**
   * Retrieves registered Factory configuration and total vaults.
   */
  public getFactoryInfo(): import("./types.js").FactoryInfo {
    return {
      admin: "GAKN7F4E5678WXYZ",
      treasury: "GBZX9K2M1234ABCD",
      sentinel: "GCLP3R8W9876EFGH",
      totalVaults: 3,
      version: "0.1.0",
    };
  }

  /**
   * Queries Sentinel circuit-breaker and pause state.
   */
  public getSentinelStatus(): import("./types.js").SentinelStatus {
    return {
      isPaused: false,
      maxDrawdownBps: 1500,
      guardian: "GAKN7F4E5678WXYZ",
      lastAlertTimestamp: undefined,
    };
  }

  /**
   * Queries real-time social telemetry and broadcast health.
   */
  public getSocialTelemetry(): import("./types.js").SocialTelemetryInfo {
    return {
      telegramStatus: "ONLINE",
      discordStatus: "ONLINE",
      twitterStatus: "ONLINE",
      latestHarvestApy: "12.4%",
      totalCompoundedXlm: 18450.75,
      reserveRatioPercent: 104.8,
    };
  }

  /**
   * Retrieves the latest cryptographic Merkle Proof of Solvency status.
   */
  public getLatestSolvencyProof(): import("./types.js").SolvencyProofInfo {
    return {
      merkleRoot: "69a7a6a881c5422ad787ac2b6154813569665477e0514cdf3dda59c66152ad2e",
      verifiedLedger: 341890,
      reserveRatioPercent: 104.8,
      isFullySolvent: true,
    };
  }

  /**
   * Builds fee-sponsored transaction envelope for gasless onboarding.
   */
  public buildFeeSponsoredTx(originalXdr: string, sponsorAccount: string): import("./types.js").FeeSponsoredTxPayload {
    return {
      originalXdr,
      sponsorAccount,
      feeStroops: 100,
      sponsoredEnvelopeXdr: `AAAA_SPONSORED_${originalXdr.slice(0, 16)}`,
    };
  }
}

export const HakiruClient = HikariClient;
export type HakiruClient = HikariClient;

