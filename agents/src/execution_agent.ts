import { ActionProposal } from "hikari-engine";
import { RiskAssessment } from "./risk_agent.js";
import { RankedStrategy } from "./yield_agent.js";
import {
  rpc,
  Contract,
  Keypair,
  Address,
  TransactionBuilder,
  Networks,
  nativeToScVal,
} from "@stellar/stellar-sdk";

export class ExecutionAgent {
  private server: rpc.Server;
  private strategyMap: Record<string, string> = {
    strat_blend_backstop_01: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
    strat_blend_xlm_01: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
    strat_blend_xlm_lending_01: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
    strat_phoenix_xlm_usdc_01: "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5",
    strat_soroswap_xlm_usdc_01: "CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3",
  };

  constructor(rpcUrl: string = "https://soroban-testnet.stellar.org") {
    this.server = new rpc.Server(rpcUrl);
  }

  public buildProposal(
    risk: RiskAssessment,
    rankedStrategies: RankedStrategy[]
  ): ActionProposal | null {
    if (!risk.safeToRebalance || risk.maxRecommendedAllocationStroops <= 0n) {
      return null;
    }

    const target = rankedStrategies.find((s) => s.strategyId === risk.targetStrategyId);
    if (!target) return null;

    const proposalId = `hikari_prop_${Date.now()}`;

    return {
      id: proposalId,
      timestamp: Date.now(),
      proposerAgent: "agent_execution_01",
      actionType: "ALLOCATE",
      targetStrategy: target.strategyId,
      amountStroops: risk.maxRecommendedAllocationStroops,
      expectedYieldBps: target.nominalApyBps,
      maxSlippageBps: 30, // 0.30%
      rationale: `Automated rebalance: Deploying capital to ${target.name} (${(target.nominalApyBps / 100).toFixed(2)}% APY).`,
    };
  }

  public async executeOnChain(
    proposal: ActionProposal,
    vaultContractId: string = "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5"
  ): Promise<string> {
    const agentSecret = process.env.AGENT_SECRET_KEY;
    if (!agentSecret) {
      throw new Error("AGENT_SECRET_KEY environment variable is required to execute on-chain proposals.");
    }
    const keypair = Keypair.fromSecret(agentSecret);

    const targetStrategyAddress =
      this.strategyMap[proposal.targetStrategy] ||
      (proposal.targetStrategy.startsWith("C")
        ? proposal.targetStrategy
        : "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL");

    const vaultId =
      vaultContractId.startsWith("C")
        ? vaultContractId
        : "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5";

    const account = await this.server.getAccount(keypair.publicKey());
    const contract = new Contract(vaultId);

    const tx = new TransactionBuilder(account, {
      fee: "2000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "allocate_to_strategy",
          new Address(keypair.publicKey()).toScVal(),
          new Address(targetStrategyAddress).toScVal(),
          nativeToScVal(proposal.amountStroops, { type: "i128" })
        )
      )
      .setTimeout(60)
      .build();

    const preparedTx = await this.server.prepareTransaction(tx);
    preparedTx.sign(keypair);

    const sendRes = await this.server.sendTransaction(preparedTx);
    if (sendRes.status === "ERROR") {
      throw new Error(`Transaction send error: ${JSON.stringify(sendRes.errorResult)}`);
    }

    const txHash = sendRes.hash;

    // Poll for confirmation
    let status: string = sendRes.status;
    let attempts = 0;
    while (status === "PENDING" && attempts < 15) {
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
      const txRes = await this.server.getTransaction(txHash);
      status = txRes.status;
      if (status === "SUCCESS") {
        return txHash;
      }
      if (status === "FAILED") {
        throw new Error(`Transaction failed on-chain: ${txHash}`);
      }
    }

    return txHash;
  }
}
