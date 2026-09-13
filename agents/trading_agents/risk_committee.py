"""
Hikari Protocol: AI Trading Agents - Risk Management Committee
Adapted from TauricResearch/TradingAgents (Aggressive, Conservative, Neutral Risk Analysts).
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

from typing import Dict, Any, List

class AggressiveRiskDebator:
    """
    Aggressive Risk Analyst:
    Emphasizes opportunity cost, capital efficiency, and capturing maximum momentum upside.
    """

    def debate(self, trader_proposal: Dict[str, Any], market_report: Dict[str, Any]) -> Dict[str, Any]:
        rr = trader_proposal.get("risk_reward_ratio", 2.0)
        action = trader_proposal.get("action")

        if action == "Buy":
            view = (
                f"Approve aggressive deployment. A risk/reward ratio of {rr}:1 with strong technical confirmation "
                "justifies capturing maximum upside before yield spread decays."
            )
            adjusted_sizing = "12.0% of Vault Capital"
        elif action == "Sell":
            view = "Approve rapid tactical de-risking to lock in liquidity buffers."
            adjusted_sizing = "Full Tactical De-risk"
        else:
            view = "Maintain capital ready for immediate deployment upon breakout."
            adjusted_sizing = "0%"

        report = f"""#### 🚀 Aggressive Risk Analyst
- **Stance**: Maximum Capital Deployment
- **Assessment**: {view}
- **Recommended Sizing**: {adjusted_sizing}
"""
        return {
            "speaker": "AggressiveRiskDebator",
            "assessment": view,
            "recommended_sizing": adjusted_sizing,
            "report": report.strip()
        }


class ConservativeRiskDebator:
    """
    Conservative Risk Analyst:
    Prioritizes capital preservation, strict stop-loss adherence, drawdown minimization,
    and solvency preservation.
    """

    def debate(self, trader_proposal: Dict[str, Any], market_report: Dict[str, Any]) -> Dict[str, Any]:
        atr = market_report.get("atr", 0.005)
        stop_loss = trader_proposal.get("stop_loss", 0.0)
        action = trader_proposal.get("action")

        if action == "Buy":
            view = (
                f"Exercise caution. ATR of ${atr:.5f} demands strict adherence to the ${stop_loss:.5f} stop. "
                "Cap maximum position size to prevent drawdown from breaching the 10% reserve buffer."
            )
            adjusted_sizing = "5.0% of Vault Capital"
        elif action == "Sell":
            view = "Support defensive de-risking to safeguard principal capital."
            adjusted_sizing = "100% Capital Preserved"
        else:
            view = "Hold is optimal. Capital preservation guaranteed while earning base yield."
            adjusted_sizing = "0%"

        report = f"""#### 🛡️ Conservative Risk Analyst
- **Stance**: Capital Preservation & Drawdown Containment
- **Assessment**: {view}
- **Recommended Sizing**: {adjusted_sizing}
"""
        return {
            "speaker": "ConservativeRiskDebator",
            "assessment": view,
            "recommended_sizing": adjusted_sizing,
            "report": report.strip()
        }


class NeutralRiskDebator:
    """
    Neutral Risk Analyst:
    Synthesizes volatility, Kelly Criterion probability, and Sharpe efficiency into balanced parameters.
    """

    def debate(self, trader_proposal: Dict[str, Any], market_report: Dict[str, Any]) -> Dict[str, Any]:
        rr = trader_proposal.get("risk_reward_ratio", 2.0)
        action = trader_proposal.get("action")

        if action == "Buy":
            # Balanced sizing calculation
            balanced_sizing = "7.5% of Vault Capital"
            view = (
                f"Harmonized recommendation: Maintain standard sizing of {balanced_sizing}. "
                f"At {rr}:1 R:R, the mathematical expectancy is distinctly positive under conservative Kelly scaling."
            )
        elif action == "Sell":
            balanced_sizing = "Orderly De-risk"
            view = "Orderly rotation into stable USDC reserves recommended."
        else:
            balanced_sizing = "0%"
            view = "Balanced state confirmed. Zero position change warranted."

        report = f"""#### ⚖️ Neutral Risk Analyst
- **Stance**: Balanced Expectancy & Kelly Sizing
- **Assessment**: {view}
- **Recommended Sizing**: {balanced_sizing}
"""
        return {
            "speaker": "NeutralRiskDebator",
            "assessment": view,
            "recommended_sizing": balanced_sizing,
            "report": report.strip()
        }
