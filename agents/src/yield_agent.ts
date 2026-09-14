import { MarketData } from "./market_agent.js";

export type StrategyCategory =
  | "LENDING_EMISSIONS"
  | "BACKSTOP_STAKING"
  | "CONCENTRATED_AMM"
  | "CONSTANT_PRODUCT_FARM"
  | "SDEX_INCENTIVES";

export interface RankedStrategy {
  strategyId: string;
  name: string;
  category: StrategyCategory;
  venue: string;
  baseApyBps: number;
  emissionBoostApyBps: number;
  mevAlphaBoostBps: number;
  nominalApyBps: number;
  riskPenaltyBps: number;
  riskAdjustedApyBps: number;
  score: number;
  targetWeightPct: number;
  recommendedAction: "ALLOCATE" | "MAINTAIN" | "DEALLOCATE";
}

export class YieldAgent {
  /**
   * Evaluates the entire Stellar ecosystem yield landscape, aggregates
   * base yield + token incentives + MEV boost, subtracts volatility/IL penalties,
   * and ranks all candidate strategies to deliver the BEST yield on Stellar.
   */
  public rankStrategies(market: MarketData): RankedStrategy[] {
    // Dynamic Volatility Penalty scalar
    const volPenaltyMultiplier = market.volatilityIndex / 25; // 1.0 at baseline 25 vol

    const candidateVenues = [
      {
        strategyId: "strat_blend_backstop_01",
        name: "Blend Protocol Backstop Module (bBLND-XLM)",
        category: "BACKSTOP_STAKING" as StrategyCategory,
        venue: "Blend Protocol 27",
        baseApyBps: 850,
        emissionBoostApyBps: market.blendBackstopApyBps - 850, // 13.00% emission + liquidation fees
        mevAlphaBoostBps: market.mevStreamApyBps,
        baseRiskPenaltyBps: 160, // First-loss capital tranche risk
        targetWeightPct: 35,    // 35% allocation to high-yield backstop
      },
      {
        strategyId: "strat_phoenix_xlm_usdc_01",
        name: "Phoenix XLM-USDC Concentrated Liquidity (CLAMM ±2%)",
        category: "CONCENTRATED_AMM" as StrategyCategory,
        venue: "Phoenix CLAMM",
        baseApyBps: market.phoenixFeeApyBps, // 18.60%
        emissionBoostApyBps: 0,
        mevAlphaBoostBps: market.mevStreamApyBps,
        baseRiskPenaltyBps: Math.round(180 * volPenaltyMultiplier), // Concentrated IL risk
        targetWeightPct: 30,    // 30% allocation to active concentrated MM
      },
      {
        strategyId: "strat_soroswap_xlm_usdc_01",
        name: "Soroswap XLM-USDC Dynamic AMM Pool & Farm",
        category: "CONSTANT_PRODUCT_FARM" as StrategyCategory,
        venue: "Soroswap",
        baseApyBps: market.soroswapFeeApyBps, // 10.40%
        emissionBoostApyBps: market.soroswapFarmApyBps, // 4.80% (15.20% total)
        mevAlphaBoostBps: market.mevStreamApyBps,
        baseRiskPenaltyBps: Math.round(140 * volPenaltyMultiplier),
        targetWeightPct: 20,    // 20% allocation to constant product AMM
      },
      {
        strategyId: "strat_blend_xlm_lending_01",
        name: "Blend Protocol XLM Supply + BLND Mining Emissions",
        category: "LENDING_EMISSIONS" as StrategyCategory,
        venue: "Blend Protocol 27",
        baseApyBps: market.blendSupplyApyBps, // 6.80%
        emissionBoostApyBps: market.blendEmissionApyBps, // 7.40% (14.20% total)
        mevAlphaBoostBps: 0,
        baseRiskPenaltyBps: 40, // Ultra-safe senior collateralized tranche
        targetWeightPct: 15,    // 15% allocation to senior lending
      },
      {
        strategyId: "strat_aqua_sdex_01",
        name: "Aqua Liquidity Bribes & SDEX Automated Market Making",
        category: "SDEX_INCENTIVES" as StrategyCategory,
        venue: "Stellar SDEX",
        baseApyBps: 920,
        emissionBoostApyBps: 460, // 13.80% total
        mevAlphaBoostBps: market.mevStreamApyBps,
        baseRiskPenaltyBps: 110,
        targetWeightPct: 0,     // Fallback standby venue
      },
    ];

    return candidateVenues
      .map((s) => {
        const nominalApyBps = s.baseApyBps + s.emissionBoostApyBps + s.mevAlphaBoostBps;
        const riskAdjustedApyBps = Math.max(0, nominalApyBps - s.baseRiskPenaltyBps);
        const score = riskAdjustedApyBps / 100;

        return {
          strategyId: s.strategyId,
          name: s.name,
          category: s.category,
          venue: s.venue,
          baseApyBps: s.baseApyBps,
          emissionBoostApyBps: s.emissionBoostApyBps,
          mevAlphaBoostBps: s.mevAlphaBoostBps,
          nominalApyBps,
          riskPenaltyBps: s.baseRiskPenaltyBps,
          riskAdjustedApyBps,
          score,
          targetWeightPct: s.targetWeightPct,
          recommendedAction: score > 10.0 ? ("ALLOCATE" as const) : ("MAINTAIN" as const),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Returns the single best risk-adjusted yield strategy currently available on Stellar.
   */
  public getBestYieldStrategy(market: MarketData): RankedStrategy {
    const ranked = this.rankStrategies(market);
    return ranked[0];
  }

  /**
   * Computes the weighted average composite net APY across the optimized portfolio.
   */
  public calculateBlendedPortfolioApyBps(strategies: RankedStrategy[]): number {
    let totalWeight = 0;
    let weightedApy = 0;

    for (const s of strategies) {
      if (s.targetWeightPct > 0) {
        totalWeight += s.targetWeightPct;
        weightedApy += s.nominalApyBps * s.targetWeightPct;
      }
    }

    return totalWeight > 0 ? Math.round(weightedApy / totalWeight) : 0;
  }
}

