"""
Unit & Integration Test Suite for Hikari XLM AI Trading Agents
Validates architecture adapted from TauricResearch/TradingAgents.
Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

import os
import sys
import unittest

# Add project root and agents directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../agents")))

from agents.trading_agents.indicators import (
    calculate_sma,
    calculate_ema,
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_atr,
    calculate_vwma,
    compute_all_indicators,
)
from agents.trading_agents.data_feed import StellarMarketDataFeed
from agents.trading_agents.analysts import (
    MarketAnalyst,
    FundamentalsAnalyst,
    SentimentAnalyst,
    NewsAnalyst,
)
from agents.trading_agents.researchers import (
    BullResearcher,
    BearResearcher,
    ResearchManager,
    PortfolioRating,
)
from agents.trading_agents.trader import TraderAgent, TraderAction
from agents.trading_agents.risk_committee import (
    AggressiveRiskDebator,
    ConservativeRiskDebator,
    NeutralRiskDebator,
)
from agents.trading_agents.portfolio_manager import PortfolioManager
from agents.trading_agents.engine import XLMTradingAgentsEngine


class TestTradingAgentsXLM(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data_feed = StellarMarketDataFeed(base_price=0.1285)
        cls.ohlcv = cls.data_feed.get_historical_ohlcv(days=60, trend="bullish", seed=100)

    def test_01_technical_indicators(self):
        """Test calculation accuracy and bounds of technical indicators."""
        closes = [c["close"] for c in self.ohlcv]
        highs = [c["high"] for c in self.ohlcv]
        lows = [c["low"] for c in self.ohlcv]
        volumes = [c["volume"] for c in self.ohlcv]

        sma_20 = calculate_sma(closes, 20)
        self.assertIsNotNone(sma_20[-1])
        self.assertGreater(sma_20[-1], 0)

        ema_10 = calculate_ema(closes, 10)
        self.assertIsNotNone(ema_10[-1])
        self.assertGreater(ema_10[-1], 0)

        rsi = calculate_rsi(closes, 14)
        self.assertIsNotNone(rsi[-1])
        self.assertTrue(0.0 <= rsi[-1] <= 100.0, f"RSI out of bounds: {rsi[-1]}")

        macd = calculate_macd(closes)
        self.assertIn("macd", macd)
        self.assertIn("signal", macd)
        self.assertIn("hist", macd)

        bb = calculate_bollinger_bands(closes, 20)
        self.assertTrue(bb["upper"][-1] >= bb["middle"][-1] >= bb["lower"][-1])

        atr = calculate_atr(highs, lows, closes, 14)
        self.assertIsNotNone(atr[-1])
        self.assertGreater(atr[-1], 0)

        vwma = calculate_vwma(closes, volumes, 20)
        self.assertIsNotNone(vwma[-1])
        self.assertGreater(vwma[-1], 0)

        snapshot = compute_all_indicators(self.ohlcv)
        self.assertIn("current_price", snapshot)
        self.assertIn("trend_bias", snapshot)
        self.assertIn(snapshot["trend_bias"], ["BULLISH", "BEARISH"])

    def test_02_analysts_evaluations(self):
        """Test that all 4 analysts produce valid structured reports."""
        market_analyst = MarketAnalyst()
        fund_analyst = FundamentalsAnalyst()
        sent_analyst = SentimentAnalyst()
        news_analyst = NewsAnalyst()

        m_rep = market_analyst.analyze(self.ohlcv)
        self.assertIn(m_rep["signal"], ["BULLISH", "BEARISH", "NEUTRAL"])
        self.assertTrue(0.0 <= m_rep["confidence"] <= 1.0)
        self.assertIn("Technical Market Analyst Report", m_rep["report"])

        f_rep = fund_analyst.analyze(self.data_feed.get_stellar_fundamentals())
        self.assertIn(f_rep["signal"], ["BULLISH", "BEARISH", "NEUTRAL"])
        self.assertIn("Stellar Network Fundamentals & Best Yield Report", f_rep["report"])

        s_rep = sent_analyst.analyze(self.data_feed.get_sentiment_and_news())
        self.assertIn(s_rep["signal"], ["BULLISH", "BEARISH", "NEUTRAL"])
        self.assertIn("Social Sentiment & Psychology Report", s_rep["report"])

        n_rep = news_analyst.analyze(self.data_feed.get_sentiment_and_news())
        self.assertIn(n_rep["signal"], ["BULLISH", "BEARISH", "NEUTRAL"])
        self.assertIn("News & Macroeconomic Catalyst Report", n_rep["report"])

    def test_03_research_team_debate(self):
        """Test Bull vs Bear debate and Research Manager synthesis."""
        m_rep = MarketAnalyst().analyze(self.ohlcv)
        f_rep = FundamentalsAnalyst().analyze(self.data_feed.get_stellar_fundamentals())
        s_rep = SentimentAnalyst().analyze(self.data_feed.get_sentiment_and_news())
        n_rep = NewsAnalyst().analyze(self.data_feed.get_sentiment_and_news())

        bull = BullResearcher().form_thesis(m_rep, f_rep, s_rep, n_rep)
        bear = BearResearcher().form_thesis(m_rep, f_rep, s_rep, n_rep)

        self.assertGreater(bull["upside_target"], m_rep["current_price"])
        self.assertLess(bear["downside_target"], m_rep["current_price"])

        plan = ResearchManager().synthesize(m_rep, f_rep, bull, bear)
        self.assertIsInstance(plan["recommendation"], PortfolioRating)
        self.assertTrue(len(plan["rationale"]) > 10)
        self.assertTrue(len(plan["strategic_actions"]) > 10)

    def test_04_trader_agent_proposal(self):
        """Test Trader proposal generation with ATR stop-loss and targets."""
        m_rep = MarketAnalyst().analyze(self.ohlcv)
        f_rep = FundamentalsAnalyst().analyze(self.data_feed.get_stellar_fundamentals())
        bull = BullResearcher().form_thesis(m_rep, f_rep, {}, {})
        bear = BearResearcher().form_thesis(m_rep, f_rep, {}, {})
        plan = ResearchManager().synthesize(m_rep, f_rep, bull, bear)

        trader = TraderAgent()
        proposal = trader.propose_trade(plan, m_rep)

        self.assertIn(proposal["action"], [TraderAction.BUY, TraderAction.HOLD, TraderAction.SELL])
        self.assertGreater(proposal["entry_price"], 0)
        self.assertGreater(proposal["stop_loss"], 0)
        self.assertGreater(proposal["take_profit"], 0)
        self.assertGreaterEqual(proposal["risk_reward_ratio"], 1.0)
        self.assertIn("FINAL TRANSACTION PROPOSAL", proposal["report"])

    def test_05_risk_committee_and_portfolio_manager(self):
        """Test Risk Management debate and Soroban invariant enforcement."""
        m_rep = MarketAnalyst().analyze(self.ohlcv)
        f_rep = FundamentalsAnalyst().analyze(self.data_feed.get_stellar_fundamentals())
        bull = BullResearcher().form_thesis(m_rep, f_rep, {}, {})
        bear = BearResearcher().form_thesis(m_rep, f_rep, {}, {})
        plan = ResearchManager().synthesize(m_rep, f_rep, bull, bear)
        proposal = TraderAgent().propose_trade(plan, m_rep)

        agg = AggressiveRiskDebator().debate(proposal, m_rep)
        cons = ConservativeRiskDebator().debate(proposal, m_rep)
        neut = NeutralRiskDebator().debate(proposal, m_rep)

        risk_debate = {"aggressive": agg, "conservative": cons, "neutral": neut}

        pm = PortfolioManager(min_buffer_floor_bps=1000, max_velocity_delta_bps=1500, max_slippage_bps=50)
        decision = pm.decide(plan, proposal, risk_debate, m_rep)

        self.assertIn(decision["verdict"], ["APPROVED", "ADJUSTED"])
        self.assertLessEqual(decision["approved_size_bps"], 1500, "Velocity delta cap violated!")
        self.assertGreater(decision["stop_loss"], 0)
        self.assertIn("execution_order", decision)
        self.assertEqual(decision["execution_order"]["protocol"], "Hikari Protocol 27 (Soroban)")
        self.assertTrue(decision["execution_order"]["invariant_verifications"]["cash_buffer_floor_preserved"])

    def test_06_end_to_end_engine_regimes(self):
        """Test full multi-agent cycle across Bullish, Bearish, and Neutral regimes."""
        engine = XLMTradingAgentsEngine()

        for regime in ["bullish", "bearish", "neutral"]:
            result = engine.run_cycle(days=45, market_regime=regime, seed=42)
            self.assertIn("final_decision", result)
            self.assertIn("markdown_report", result)
            self.assertEqual(result["metadata"]["market_regime"], regime)
            self.assertIn("HIKARI PROTOCOL — AI TRADING AGENTS REPORT", result["markdown_report"])


if __name__ == "__main__":
    unittest.main()
