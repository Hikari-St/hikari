// Hikari Protocol: Discord Rich Embed Telemetry & Milestone Publisher
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

import { HarvestEvent, RebalanceEvent, SolvencyEvent, SentinelAlertEvent } from "./types";

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

export class HikariDiscordPublisher {
  private webhookUrl: string | undefined;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  }

  public createHarvestEmbed(harvest: HarvestEvent): DiscordEmbed {
    return {
      title: `🌾 Auto-Compound Harvest Executed [${harvest.vault}]`,
      color: 0x10b981, // Emerald green
      fields: [
        { name: "Yield Harvested", value: `+${harvest.yieldHarvested}`, inline: true },
        { name: "Principal Reinvested", value: harvest.reinvestedAssets, inline: true },
        { name: "New Dynamic APY", value: `🔥 ${harvest.newApy}`, inline: true },
        { name: "Stellar Tx Hash", value: `\`${harvest.txHash.slice(0, 16)}...\``, inline: false },
      ],
      footer: { text: "Hikari Protocol • Autonomous Yield Engine" },
      timestamp: harvest.timestamp || new Date().toISOString(),
    };
  }

  public createRebalanceEmbed(rebalance: RebalanceEvent): DiscordEmbed {
    const weightsFormatted = Object.entries(rebalance.weights)
      .map(([k, v]) => `• **${k}**: ${v}%`)
      .join("\n");

    return {
      title: `⚖️ Strategy Rebalance Complete [${rebalance.vault}]`,
      color: 0xc084fc, // Purple soft
      description: `**AI Allocation Rationale:**\n_${rebalance.rationale}_`,
      fields: [
        { name: "New Allocation Weights", value: weightsFormatted, inline: false },
        { name: "Transaction Hash", value: `\`${rebalance.txHash.slice(0, 16)}...\``, inline: false },
      ],
      footer: { text: "Hikari Autonomous Multi-Agent Orchestrator" },
      timestamp: rebalance.timestamp || new Date().toISOString(),
    };
  }

  public createSolvencyEmbed(solvency: SolvencyEvent): DiscordEmbed {
    return {
      title: "🛡️ Daily Cryptographic Proof of Solvency Verified",
      color: 0x38bdf8, // Sky cyan
      description: "On-chain liabilities matched 100% against verified reserves in Soroban contracts.",
      fields: [
        { name: "Reserve Backing Ratio", value: `✅ ${solvency.reserveRatio}`, inline: true },
        { name: "Verified Ledger", value: `#${solvency.verifiedLedger}`, inline: true },
        { name: "Total Reserves Backing", value: solvency.totalReserves, inline: false },
        { name: "Merkle Root Hash", value: `\`${solvency.merkleRoot}\``, inline: false },
      ],
      footer: { text: "Hikari Protocol • Zero-Knowledge Solvency Verification" },
      timestamp: solvency.timestamp || new Date().toISOString(),
    };
  }

  public createSentinelAlertEmbed(alert: SentinelAlertEvent): DiscordEmbed {
    return {
      title: `🚨 SAFETY SENTINEL ALERT: ${alert.level} [${alert.vault}]`,
      color: 0xef4444, // Red
      description: `**Trigger Reason:** ${alert.reason}\n**Action Taken:** ${alert.actionTaken}`,
      fields: [
        { name: "Circuit Breaker", value: "GateSeal Engaged", inline: true },
        { name: "Fund Safety", value: "100% Capital Preserved", inline: true },
      ],
      footer: { text: "Hikari Autonomous Circuit Breaker Sentinel" },
      timestamp: alert.timestamp || new Date().toISOString(),
    };
  }

  public async publishEmbed(embed: DiscordEmbed): Promise<{ success: boolean; simulated: boolean }> {
    if (this.webhookUrl && !this.webhookUrl.includes("YOUR_")) {
      try {
        const res = await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });
        return { success: res.ok, simulated: false };
      } catch (e) {
        console.error("[Discord Publisher] Webhook delivery failed:", e);
        return { success: false, simulated: false };
      }
    } else {
      console.log("[Discord Publisher] [SANDBOX MODE] Simulated Embed:", JSON.stringify(embed, null, 2));
      return { success: true, simulated: true };
    }
  }
}

// Backwards-compatibility alias
export const HakiruDiscordPublisher = HikariDiscordPublisher;
export type HakiruDiscordPublisher = HikariDiscordPublisher;
