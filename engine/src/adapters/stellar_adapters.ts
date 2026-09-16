import { rpc, Contract, Account, TransactionBuilder, scValToNative } from "@stellar/stellar-sdk";
import { IYieldAdapter, LiveYieldBreakdown, YieldAdapterMetadata } from "./types.js";

const DUMMY_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export class OnChainAdapterReader {
  private server: rpc.Server;
  private networkPassphrase: string;

  constructor(
    rpcUrl = "https://soroban-testnet.stellar.org",
    networkPassphrase = "Test SDF Network ; September 2015"
  ) {
    this.server = new rpc.Server(rpcUrl);
    this.networkPassphrase = networkPassphrase;
  }

  public async simulateCall<T>(contractId: string, functionName: string, args: any[] = []): Promise<T | null> {
    try {
      const contract = new Contract(contractId);
      const dummy = new Account(DUMMY_ACCOUNT, "0");
      const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: this.networkPassphrase })
        .addOperation(contract.call(functionName, ...args))
        .setTimeout(30)
        .build();
      const sim = await this.server.simulateTransaction(tx);
      if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
        return scValToNative(sim.result.retval) as T;
      }
    } catch {
      // Handled gracefully by callers
    }
    return null;
  }
}

/**
 * Shared base for the three deployed adapter contracts (blend_adapter, phoenix_adapter,
 * soroswap_adapter). Each is deployed to testnet and genuinely holds/accounts funds, but NONE
 * of them call the real external protocol they're named after — they accrue interest internally
 * at a fixed configured rate (see `configured_rate_bps()` on each Rust contract). getLiveYield()
 * used to return entirely hardcoded bps numbers (e.g. Blend's "8.50% base + 13.00% emissions +
 * 3.20% MEV = 24.70%") with a name implying a live read. It now reads the real configured rate
 * and real TVL, and does not report per-component breakdowns (base/emissions/MEV) that this
 * protocol doesn't actually track.
 */
abstract class SimulatedYieldAdapterBase implements IYieldAdapter {
  protected abstract reader: OnChainAdapterReader;
  public abstract metadata: YieldAdapterMetadata;

  public async getLiveYield(): Promise<LiveYieldBreakdown> {
    const [rateRaw, tvlRaw] = await Promise.all([
      this.reader.simulateCall<any>(this.metadata.underlyingPoolAddress, "configured_rate_bps"),
      this.reader.simulateCall<any>(this.metadata.underlyingPoolAddress, "total_value"),
    ]);

    // configured_rate_bps() only exists on adapters redeployed with it — older deployments
    // return null here, which is reported honestly (0, not a guessed number).
    const baseApyBps = rateRaw !== null ? Number(rateRaw) : 0;
    const tvlStroops = tvlRaw !== null ? (typeof tvlRaw === "bigint" ? tvlRaw : BigInt(tvlRaw)) : 0n;

    return {
      baseApyBps,
      incentiveEmissionApyBps: 0, // not tracked — this adapter has no emissions mechanism
      mevAlphaBoostBps: 0, // not tracked — no MEV capture is wired into this adapter
      totalNominalApyBps: baseApyBps,
      volatilityRiskPenaltyBps: 0, // not tracked
      netRiskAdjustedApyBps: baseApyBps,
      tvlStroops,
      lastUpdatedTimestamp: Date.now(),
    };
  }

  public async getTotalAssets(): Promise<bigint> {
    const onChainVal = await this.reader.simulateCall<any>(this.metadata.underlyingPoolAddress, "total_value");
    if (onChainVal !== null) {
      return typeof onChainVal === "bigint" ? onChainVal : BigInt(onChainVal);
    }
    return 0n; // unreachable — report zero, not a fabricated fallback figure
  }

  // The deployed adapter contracts charge no fee on deposit/withdraw (see contracts/*/src/lib.rs:
  // amounts pass through 1:1). Previously these returned an unexplained hardcoded fee constant.
  public async simulateDeposit(amountStroops: bigint) {
    return { sharesReceived: amountStroops, estimatedFeeStroops: 0n };
  }

  public async simulateWithdraw(shares: bigint) {
    return { assetsOutStroops: shares, estimatedFeeStroops: 0n };
  }
}

export class BlendBackstopAdapter extends SimulatedYieldAdapterBase {
  protected reader = new OnChainAdapterReader();

  public metadata: YieldAdapterMetadata = {
    protocolId: "blend_backstop",
    name: "Blend Adapter (simulated yield — does not call the real Blend protocol)",
    category: "BACKSTOP_STAKING",
    adapterAddress: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
    underlyingPoolAddress: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
    reserveAsset: "XLM",
    settlementVerified: false, // no settlement-liveness check is implemented anywhere in this codebase
    livenessScore: 0, // not computed — no liveness-scoring implementation exists
  };
}

export class PhoenixClammAdapter extends SimulatedYieldAdapterBase {
  protected reader = new OnChainAdapterReader();

  public metadata: YieldAdapterMetadata = {
    protocolId: "phoenix_clamm",
    name: "Phoenix Adapter (simulated yield — does not call the real Phoenix protocol)",
    category: "CONCENTRATED_AMM",
    adapterAddress: "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
    underlyingPoolAddress: "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
    reserveAsset: "XLM",
    settlementVerified: false,
    livenessScore: 0,
  };
}

export class SoroswapFarmAdapter extends SimulatedYieldAdapterBase {
  protected reader = new OnChainAdapterReader();

  public metadata: YieldAdapterMetadata = {
    protocolId: "soroswap_farm",
    name: "Soroswap Adapter (simulated yield — does not call the real Soroswap protocol)",
    category: "CONSTANT_PRODUCT_FARM",
    adapterAddress: "CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3",
    underlyingPoolAddress: "CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3",
    reserveAsset: "XLM",
    settlementVerified: false,
    livenessScore: 0,
  };
}

// DefindexVaultAdapter was removed: it pointed at a fictional contract address
// ("C_DEFINDEX_VAULT_P27" — not a real Stellar strkey, never deployed) and returned entirely
// hardcoded yield numbers. There is no Defindex integration in this codebase.
