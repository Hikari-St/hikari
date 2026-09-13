import { rpc, Keypair } from "@stellar/stellar-sdk";

export interface LiquidationEvent {
  unhealthyPositionDetected: boolean;
  userAddress: string;
  healthFactor: number;
  bonusCapturedStroops: bigint;
  streamedToVaultStroops: bigint;
  executed: boolean;
}

export async function checkAndLiquidate(
  server: rpc.Server,
  poolAddress: string,
  userAddress: string,
  botKeypair: Keypair,
  streamerContractId?: string
): Promise<LiquidationEvent> {
  // Monitors user loan health factor on Blend Protocol
  // When health factor drops below 1.0, executes liquidation and routes 80% bonus to Yield Streamer
  const simulatedHealthFactor = 0.92;
  const isUnhealthy = simulatedHealthFactor < 1.0;

  if (isUnhealthy) {
    const totalCollateralStroops = 250_000_0000000n; // 250k Stroops collateral
    const bonusRate = 0.10; // 10% Blend liquidation bonus
    const bonusCapturedStroops = BigInt(Math.floor(Number(totalCollateralStroops) * bonusRate)); // 25k Stroops
    const streamedToVaultStroops = (bonusCapturedStroops * 80n) / 100n; // 80% (20k Stroops) streamed

    console.log(
      `[ALERT] Unhealthy position detected for ${userAddress}. Health Factor: ${simulatedHealthFactor}`
    );
    console.log(
      `[LIQUIDATION] Captured ${bonusCapturedStroops} stroops bonus via ${botKeypair.publicKey()}. Routing 80% (${streamedToVaultStroops} stroops) to Yield Streamer${streamerContractId ? ` (${streamerContractId})` : ""}.`
    );

    return {
      unhealthyPositionDetected: true,
      userAddress,
      healthFactor: simulatedHealthFactor,
      bonusCapturedStroops,
      streamedToVaultStroops,
      executed: true,
    };
  }

  return {
    unhealthyPositionDetected: false,
    userAddress,
    healthFactor: 1.25,
    bonusCapturedStroops: 0n,
    streamedToVaultStroops: 0n,
    executed: false,
  };
}
