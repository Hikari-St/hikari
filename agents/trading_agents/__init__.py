"""
Hikari Protocol: AI Trading Agents Package
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

from .indicators import compute_all_indicators
from .data_feed import StellarMarketDataFeed
from .analysts import MarketAnalyst, FundamentalsAnalyst, SentimentAnalyst, NewsAnalyst
from .researchers import BullResearcher, BearResearcher, ResearchManager, PortfolioRating
from .trader import TraderAgent, TraderAction
from .risk_committee import AggressiveRiskDebator, ConservativeRiskDebator, NeutralRiskDebator
from .portfolio_manager import PortfolioManager
from .engine import XLMTradingAgentsEngine

__all__ = [
    "compute_all_indicators",
    "StellarMarketDataFeed",
    "MarketAnalyst",
    "FundamentalsAnalyst",
    "SentimentAnalyst",
    "NewsAnalyst",
    "BullResearcher",
    "BearResearcher",
    "ResearchManager",
    "PortfolioRating",
    "TraderAgent",
    "TraderAction",
    "AggressiveRiskDebator",
    "ConservativeRiskDebator",
    "NeutralRiskDebator",
    "PortfolioManager",
    "XLMTradingAgentsEngine",
]
