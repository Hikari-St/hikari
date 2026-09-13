// Hikari Protocol: Social Gateway REST Server & Feed Handler
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

import http from "http";
import { HikariTelegramBot } from "./bot-telegram";
import { HikariDiscordPublisher } from "./bot-discord";
import { HikariXBroadcaster } from "./bot-x-broadcaster";
import { SocialBroadcastMessage, LeaderboardEntry } from "./types";

export class HikariSocialGateway {
  private telegramBot: HikariTelegramBot;
  private discordPublisher: HikariDiscordPublisher;
  private xBroadcaster: HikariXBroadcaster;
  private feed: SocialBroadcastMessage[] = [];
  private leaderboard: LeaderboardEntry[] = [
    { rank: 1, address: "GAKN...7F4E", shares: "142,500 hXLM", valueUsd: 17812, loyaltyMultiplier: "3.5x", badge: "Legendary Pioneer" },
    { rank: 2, address: "GBZX...9K2M", shares: "98,240 hXLM", valueUsd: 12280, loyaltyMultiplier: "2.8x", badge: "Master Rebalancer" },
    { rank: 3, address: "GCLP...3R8W", shares: "64,100 hXLM", valueUsd: 8012, loyaltyMultiplier: "2.5x", badge: "Soroban Sentinel" },
    { rank: 4, address: "GDTV...1B7C", shares: "42,800 hXLM", valueUsd: 5350, loyaltyMultiplier: "2.25x", badge: "Liquidity Architect" },
    { rank: 5, address: "GEFM...5N0Q", shares: "29,450 hXLM", valueUsd: 3681, loyaltyMultiplier: "2.0x", badge: "Ecosystem Builder" },
  ];

  constructor() {
    this.telegramBot = new HikariTelegramBot();
    this.discordPublisher = new HikariDiscordPublisher();
    this.xBroadcaster = new HikariXBroadcaster();
    this.seedInitialFeed();
  }

  private seedInitialFeed() {
    this.feed = [
      {
        id: "msg-1",
        type: "HARVEST",
        title: "🌾 Auto-Compound Harvest #1428",
        description: "Harvested +342.18 XLM from Blend & Phoenix. Reinvested into primary pool.",
        data: { vault: "EarnXLM", yield: "+342.18 XLM", newApy: "12.4%" },
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-2",
        type: "REBALANCE",
        title: "⚖️ Strategy Rebalance Complete",
        description: "Rebalanced EarnXLM: Blend 40% | Phoenix 30% | Soroswap 15% | Buffer 15%.",
        data: { vault: "EarnXLM", optimizer: "Predictive Sharpe ML" },
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-3",
        type: "SOLVENCY",
        title: "🛡️ Daily Proof of Solvency Verified",
        description: "100% of user liabilities backed by verified on-chain reserves. Ratio: 104.8%.",
        data: { merkleRoot: "0x8f2d...8e9f", ratio: "104.8%" },
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-4",
        type: "MILESTONE",
        title: "🚀 Testnet TVL Benchmark Achieved",
        description: "EarnXLM reached 485,000 XLM and EarnUSD crossed $42,500 testnet deposits.",
        data: { totalValuationUsd: "$121,525" },
        timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
      },
    ];
  }

  public getStatus() {
    return {
      service: "Hikari Social Gateway & Telemetry Broadcaster",
      version: "0.1.0",
      maintainer: "ibochivincent-lang",
      status: "ONLINE",
      channels: {
        telegram: process.env.TELEGRAM_BOT_TOKEN ? "LIVE_CONNECTED" : "SANDBOX_SIMULATOR",
        discord: process.env.DISCORD_WEBHOOK_URL ? "LIVE_CONNECTED" : "SANDBOX_SIMULATOR",
        twitter: process.env.TWITTER_API_KEY ? "LIVE_CONNECTED" : "SANDBOX_SIMULATOR",
      },
      feedCount: this.feed.length,
      lastEventTimestamp: this.feed[0]?.timestamp || null,
    };
  }

  public getFeed() {
    return this.feed;
  }

  public getLeaderboard() {
    return this.leaderboard;
  }

  public async broadcast(message: SocialBroadcastMessage): Promise<void> {
    this.feed.unshift(message);
    if (this.feed.length > 50) this.feed.pop();

    // Broadcast across channels
    if (message.type === "HARVEST") {
      await this.discordPublisher.publishEmbed(
        this.discordPublisher.createHarvestEmbed({
          vault: message.data.vault || "EarnXLM",
          yieldHarvested: message.data.yield || "0 XLM",
          reinvestedAssets: message.data.reinvested || "Principal Reinvested",
          newApy: message.data.newApy || "12.4%",
          txHash: "0x9c3f4e...StellarTx",
          timestamp: message.timestamp,
        })
      );
    } else if (message.type === "SOLVENCY") {
      await this.discordPublisher.publishEmbed(
        this.discordPublisher.createSolvencyEmbed({
          merkleRoot: message.data.merkleRoot || "0x8f2d...8e9f",
          totalLiabilities: "485,000 XLM + $60,900 USD",
          totalReserves: "508,280 XLM Eqv",
          reserveRatio: message.data.ratio || "104.8%",
          verifiedLedger: 341890,
          timestamp: message.timestamp,
        })
      );
    }
  }

  public getTelegramBot(): HikariTelegramBot {
    return this.telegramBot;
  }

  public getDiscordPublisher(): HikariDiscordPublisher {
    return this.discordPublisher;
  }

  public getXBroadcaster(): HikariXBroadcaster {
    return this.xBroadcaster;
  }
}

// Backwards-compatibility alias
export const HakiruSocialGateway = HikariSocialGateway;
export type HakiruSocialGateway = HikariSocialGateway;

