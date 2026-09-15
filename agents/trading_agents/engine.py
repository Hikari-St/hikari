"""
Hikari Protocol: AI Trading Agents Orchestration Engine
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .data_feed import StellarMarketDataFeed
from .analysts import MarketAnalyst, FundamentalsAnalyst, SentimentAnalyst, NewsAnalyst
from .researchers import BullResearcher, BearResearcher, ResearchManager
from .trader import TraderAgent
from .risk_committee import AggressiveRiskDebator, ConservativeRiskDebator, NeutralRiskDebator
from .portfolio_manager import PortfolioManager

class XLMTradingAgentsEngine:
    """
    Main Orchestration Engine coordinating the full hierarchical multi-agent workflow
    for Stellar Lumens (XLM), executing disciplined market analyses and risk consensus.
    """

    def __init__(self, data_feed: Optional[StellarMarketDataFeed] = None):
        self.data_feed = data_feed or StellarMarketDataFeed()
        
        # 1. Analyst Team
        self.market_analyst = MarketAnalyst()
        self.fundamentals_analyst = FundamentalsAnalyst()
        self.sentiment_analyst = SentimentAnalyst()
        self.news_analyst = NewsAnalyst()

        # 2. Researcher Team
        self.bull_researcher = BullResearcher()
        self.bear_researcher = BearResearcher()
        self.research_manager = ResearchManager()

        # 3. Trader Agent
        self.trader_agent = TraderAgent()

        # 4. Risk Management Committee
        self.aggressive_debator = AggressiveRiskDebator()
        self.conservative_debator = ConservativeRiskDebator()
        self.neutral_debator = NeutralRiskDebator()

        # 5. Portfolio Manager & Invariant Gatekeeper
        self.portfolio_manager = PortfolioManager()

    def run_cycle(self, days: int = 60, market_regime: str = "bullish", seed: int = 42) -> Dict[str, Any]:
        """
        Executes a complete multi-agent trading decision cycle.
        """
        start_time = datetime.now(timezone.utc).isoformat()

        # Step 1: Ingest Data
        ohlcv = self.data_feed.get_historical_ohlcv(days=days, trend=market_regime, seed=seed)
        fundamentals = self.data_feed.get_stellar_fundamentals()
        sentiment = self.data_feed.get_sentiment_and_news()

        # Step 2: Analyst Team Evaluations
        market_rep = self.market_analyst.analyze(ohlcv)
        fund_rep = self.fundamentals_analyst.analyze(fundamentals)
        sentiment_rep = self.sentiment_analyst.analyze(sentiment)
        news_rep = self.news_analyst.analyze(sentiment)

        # Step 3: Researcher Team Debate
        bull_thesis = self.bull_researcher.form_thesis(market_rep, fund_rep, sentiment_rep, news_rep)
        bear_thesis = self.bear_researcher.form_thesis(market_rep, fund_rep, sentiment_rep, news_rep)
        research_plan = self.research_manager.synthesize(market_rep, fund_rep, bull_thesis, bear_thesis)

        # Step 4: Trader Agent Transaction Proposal
        trader_proposal = self.trader_agent.propose_trade(research_plan, market_rep)

        # Step 5: Risk Committee Debate
        risk_agg = self.aggressive_debator.debate(trader_proposal, market_rep)
        risk_cons = self.conservative_debator.debate(trader_proposal, market_rep)
        risk_neut = self.neutral_debator.debate(trader_proposal, market_rep)
        risk_debate = {
            "aggressive": risk_agg,
            "conservative": risk_cons,
            "neutral": risk_neut
        }

        # Step 6: Portfolio Manager Final Binding Decision
        final_decision = self.portfolio_manager.decide(
            research_plan=research_plan,
            trader_proposal=trader_proposal,
            risk_debate=risk_debate,
            market_report=market_rep
        )

        end_time = datetime.now(timezone.utc).isoformat()

        # Step 7: Format Full Comprehensive Report Tree
        full_report_markdown = f"""# 🌟 HIKARI PROTOCOL — AI TRADING AGENTS REPORT
> **Target Asset**: Stellar Lumens (`XLM/USDC`)  
> **Execution Timestamp**: {start_time}  
> **Market Regime**: {market_regime.upper()}  

---

## 1. Analyst Team Deep-Dive
{market_rep['report']}

{fund_rep['report']}

{sentiment_rep['report']}

{news_rep['report']}

---

## 2. Research Team Bull vs. Bear Debate
{bull_thesis['report']}

{bear_thesis['report']}

{research_plan['report']}

---

## 3. Trader Agent Transaction Proposal
{trader_proposal['report']}

---

## 4. Risk Management Committee Debate
{risk_agg['report']}

{risk_cons['report']}

{risk_neut['report']}

---

## 5. Portfolio Manager Final Binding Decision
{final_decision['report']}

---
*Report generated autonomously by Hikari AI Trading Multi-Agent Framework.*
"""

        return {
            "metadata": {
                "started_at": start_time,
                "completed_at": end_time,
                "asset": "XLM",
                "market_regime": market_regime,
            },
            "analysts": {
                "market": market_rep,
                "fundamentals": fund_rep,
                "sentiment": sentiment_rep,
                "news": news_rep,
            },
            "research": {
                "bull": bull_thesis,
                "bear": bear_thesis,
                "plan": research_plan,
            },
            "trader": trader_proposal,
            "risk_committee": risk_debate,
            "final_decision": final_decision,
            "markdown_report": full_report_markdown
        }
