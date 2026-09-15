"""
Hikari Protocol: AI Trading Agents - Researcher Team (Bull vs. Bear Debate)
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

from enum import Enum
from typing import Dict, Any, List

class PortfolioRating(str, Enum):
    """5-tier rating used by the Research Manager and Portfolio Manager."""
    BUY = "Buy"
    OVERWEIGHT = "Overweight"
    HOLD = "Hold"
    UNDERWEIGHT = "Underweight"
    SELL = "Sell"

class BullResearcher:
    """
    Bullish Researcher:
    Synthesizes analyst reports into the strongest arguments for price appreciation,
    highlighting technical breakouts, upside targets, fundamental moat, and momentum.
    """

    def form_thesis(self, market_report: Dict[str, Any], fund_report: Dict[str, Any],
                    sentiment_report: Dict[str, Any], news_report: Dict[str, Any]) -> Dict[str, Any]:
        curr_price = market_report["current_price"]
        resistance = market_report["resistance"]
        upside_target = round(max(resistance * 1.08, curr_price * 1.15), 5)
        sent_score = sentiment_report.get("score", 0.50)
        soroban_tvl = fund_report.get("metrics", {}).get("soroban_tvl_usd", 48_500_000)

        arguments = [
            f"Technical momentum confirms strength: Current price ${curr_price:.5f} is supported by key floor at ${market_report['support']:.5f}.",
            f"Stellar Protocol 27 Soroban TVL (${soroban_tvl:,.0f}) and payment volumes provide genuine structural utility.",
            f"Sentiment index of {sent_score:+.2f} reflects institutional accumulation and retail interest.",
            f"Upcoming catalysts including Circle CCTP V2 provide direct liquidity on-ramps to Soroban pools."
        ]

        thesis_text = f"""#### 🐂 Bull Researcher Thesis
- **Target Upside**: ${upside_target:.5f} (+{((upside_target/curr_price - 1)*100):.1f}%)
- **Primary Catalysts**:
  1. {arguments[0]}
  2. {arguments[1]}
  3. {arguments[2]}
- **Verdict**: Strong expansion phase favorable for tactical long accumulation.
"""
        return {
            "speaker": "BullResearcher",
            "stance": "BULLISH",
            "upside_target": upside_target,
            "arguments": arguments,
            "report": thesis_text.strip()
        }


class BearResearcher:
    """
    Bearish Researcher:
    Critically identifies downside vulnerabilities, resistance ceilings, liquidity pullbacks,
    volatility risks, and macroeconomic hurdles.
    """

    def form_thesis(self, market_report: Dict[str, Any], fund_report: Dict[str, Any],
                    sentiment_report: Dict[str, Any], news_report: Dict[str, Any]) -> Dict[str, Any]:
        curr_price = market_report["current_price"]
        support = market_report["support"]
        downside_risk = round(min(support * 0.94, curr_price * 0.88), 5)
        atr = market_report["atr"]

        arguments = [
            f"Strong overhead resistance at ${market_report['resistance']:.5f} threatens failed breakout rejection.",
            f"Current ATR of ${atr:.5f} indicates potential whip-saw volatility and stop-hunts on leveraged positions.",
            "Broader macroeconomic liquidity conditions may trigger sudden risk-off rotations across altcoins.",
            "Protocol slippage constraints must be preserved: Any sudden market-wide sell-off could test lower liquidity buffers."
        ]

        thesis_text = f"""#### 🐻 Bear Researcher Thesis
- **Downside Risk Target**: ${downside_risk:.5f} (-{((1 - downside_risk/curr_price)*100):.1f}%)
- **Primary Vulnerabilities**:
  1. {arguments[0]}
  2. {arguments[1]}
  3. {arguments[2]}
- **Verdict**: Prudence demanded; stop-losses must remain mathematically defended.
"""
        return {
            "speaker": "BearResearcher",
            "stance": "BEARISH",
            "downside_target": downside_risk,
            "arguments": arguments,
            "report": thesis_text.strip()
        }


class ResearchManager:
    """
    Research Manager:
    Synthesizes the analyst outputs and the Bull vs. Bear debate into a balanced,
    institutional-grade ResearchPlan with a 5-tier rating (Buy, Overweight, Hold, Underweight, Sell).
    """

    def synthesize(self, market_report: Dict[str, Any], fund_report: Dict[str, Any],
                   bull_thesis: Dict[str, Any], bear_thesis: Dict[str, Any]) -> Dict[str, Any]:
        curr_price = market_report["current_price"]
        market_sig = market_report["signal"]
        fund_sig = fund_report["signal"]

        # Score weighing
        score = 0
        if market_sig == "BULLISH": score += 2
        elif market_sig == "BEARISH": score -= 2

        if fund_sig == "BULLISH": score += 1
        elif fund_sig == "BEARISH": score -= 1

        # Rating determination
        if score >= 3:
            rating = PortfolioRating.BUY
            action_desc = "Execute phased long accumulation targeting primary breakout levels."
        elif score == 2:
            rating = PortfolioRating.OVERWEIGHT
            action_desc = "Incrementally scale into position on minor intraday pullbacks."
        elif score in (-1, 0, 1):
            rating = PortfolioRating.HOLD
            action_desc = "Maintain current allocations, awaiting clear directional resolution."
        elif score == -2:
            rating = PortfolioRating.UNDERWEIGHT
            action_desc = "Reduce exposure into overhead resistance; tighten trailing stops."
        else:
            rating = PortfolioRating.SELL
            action_desc = "Liquidate tactical long exposure and transfer into stable reserve buffer."

        rationale = (
            f"The Research Committee evaluated arguments between Bull (${bull_thesis['upside_target']:.5f}) "
            f"and Bear (${bear_thesis['downside_target']:.5f}). The technical alignment ({market_sig}) combined "
            f"with verified Stellar fundamentals ({fund_sig}) resulted in a net consensus of {rating.value}."
        )

        plan_text = f"""### 🎯 Research Manager Consensus Investment Plan
- **Consensus Recommendation**: **{rating.value.upper()}**
- **Rationale**: {rationale}
- **Strategic Actions**: {action_desc}
"""
        return {
            "manager": "ResearchManager",
            "recommendation": rating,
            "rationale": rationale,
            "strategic_actions": action_desc,
            "report": plan_text.strip()
        }
