"""
Hikari Protocol: AI Trading Agents - Trader Agent
Adapted from TauricResearch/TradingAgents Trader role.
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

from enum import Enum
from typing import Dict, Any, Optional
from .researchers import PortfolioRating

class TraderAction(str, Enum):
    """3-tier transaction direction used by the Trader."""
    BUY = "Buy"
    HOLD = "Hold"
    SELL = "Sell"

class TraderAgent:
    """
    Trader Agent:
    Transforms the Research Manager's investment plan and technical market structure
    into an exact execution proposal with concrete price levels, stops, and targets.
    """

    def propose_trade(self, research_plan: Dict[str, Any], market_report: Dict[str, Any]) -> Dict[str, Any]:
        rec = research_plan["recommendation"]
        curr_price = market_report["current_price"]
        atr = market_report["atr"]
        support = market_report["support"]
        resistance = market_report["resistance"]

        # Determine action
        if rec in (PortfolioRating.BUY, PortfolioRating.OVERWEIGHT):
            action = TraderAction.BUY
            # Target entry near market price or slight limit pullback
            entry_price = round(curr_price, 5)
            # Stop loss at 1.5 * ATR below entry (or just below support)
            stop_loss = round(max(0.01, min(support * 0.98, entry_price - (1.5 * atr))), 5)
            # Take profit with minimum 2.0 risk/reward ratio
            risk = entry_price - stop_loss
            take_profit = round(entry_price + (risk * 2.2), 5)
            sizing = "8.5% of Vault Capital"
            reasoning = (
                f"Technical indicators and research consensus favor expansion. Entry positioned at ${entry_price:.5f} "
                f"with ATR stop-loss defended at ${stop_loss:.5f} and primary profit target at ${take_profit:.5f} (2.2:1 R:R)."
            )
        elif rec in (PortfolioRating.SELL, PortfolioRating.UNDERWEIGHT):
            action = TraderAction.SELL
            entry_price = round(curr_price, 5)
            stop_loss = round(entry_price + (1.5 * atr), 5)
            risk = stop_loss - entry_price
            take_profit = round(max(0.01, entry_price - (risk * 2.0)), 5)
            sizing = "Full Tactical De-risk into Reserve Buffer"
            reasoning = (
                f"Defensive de-risking initiated due to distribution risk. Take-profit set at lower liquidity bands (${take_profit:.5f}) "
                f"with protection stop above ${stop_loss:.5f}."
            )
        else:
            action = TraderAction.HOLD
            entry_price = round(curr_price, 5)
            stop_loss = round(max(0.01, entry_price - (1.5 * atr)), 5)
            take_profit = round(entry_price + (1.5 * atr * 2.0), 5)
            sizing = "0% (Hold Current Yield Allocation)"
            reasoning = (
                "Equilibrium market condition. Evidence is balanced between Bull and Bear theses. "
                "Retain existing positions in Soroban yield strategies without adding directional exposure."
            )

        proposal_text = f"""### ⚡ Trader Agent Transaction Proposal
- **Action**: **{action.value.upper()}**
- **Entry Price Target**: ${entry_price:.5f}
- **Stop-Loss (ATR Protected)**: ${stop_loss:.5f}
- **Take-Profit Target**: ${take_profit:.5f}
- **Position Sizing**: {sizing}
- **Reasoning**: {reasoning}

FINAL TRANSACTION PROPOSAL: **{action.value.upper()}**
"""
        return {
            "agent": "TraderAgent",
            "action": action,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "risk_reward_ratio": round((abs(take_profit - entry_price) / max(0.0001, abs(entry_price - stop_loss))), 2),
            "position_sizing": sizing,
            "reasoning": reasoning,
            "report": proposal_text.strip()
        }
