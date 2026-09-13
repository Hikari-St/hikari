// Hikari Protocol: Social Bot & Telemetry Module Entrypoint
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

import { HikariTelegramBot } from "./bot-telegram";
import { HikariDiscordPublisher } from "./bot-discord";
import { HikariXBroadcaster } from "./bot-x-broadcaster";
import { HikariSocialGateway } from "./social-gateway";

export * from "./types";
export * from "./bot-telegram";
export * from "./bot-discord";
export * from "./bot-x-broadcaster";
export * from "./social-gateway";

if (require.main === module) {
  console.log("=================================================");
  console.log("🌟 HIKARI PROTOCOL SOCIAL TELEMETRY & BOT SUITE 🌟");
  console.log("Maintainer: ibochivincent-lang");
  console.log("Target: Stellar / Soroban Protocol 27");
  console.log("=================================================");

  const gateway = new HikariSocialGateway();
  const telegram = gateway.getTelegramBot();
  const discord = gateway.getDiscordPublisher();
  const xBroadcaster = gateway.getXBroadcaster();

  console.log("[Status]", gateway.getStatus());

  // Demonstrate interactive telegram command processing
  console.log("\n[Demo: Telegram Command /stats]");
  console.log(telegram.processCommand("/stats"));

  console.log("\n[Demo: Telegram Command /solvency]");
  console.log(telegram.processCommand("/solvency"));

  // Demonstrate Discord harvest embed
  console.log("\n[Demo: Discord Harvest Embed Generated]");
  discord.publishEmbed(
    discord.createHarvestEmbed({
      vault: "EarnXLM",
      yieldHarvested: "342.18 XLM",
      reinvestedAssets: "485,000 XLM Total",
      newApy: "12.4%",
      txHash: "0x39a1d47ef81c902b4d9921",
      timestamp: new Date().toISOString(),
    })
  );

  // Demonstrate X milestone tweet
  console.log("\n[Demo: X Milestone Tweet Formatted]");
  xBroadcaster.broadcastTweet(
    xBroadcaster.formatTvlMilestoneTweet("485K XLM TVL", {
      tvlXlm: 485000,
      tvlUsd: 42500,
      tvlMultichain: 18400,
      totalValueUsd: 121525,
      apyXlm: 12.4,
      apyUsd: 17.0,
      apyMultichain: 14.2,
      activeStrategies: 4,
      totalVaults: 3,
      lastCompoundLedger: 341890,
      reserveBackingRatioBps: 10480,
    })
  );
}
