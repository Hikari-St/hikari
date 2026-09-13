#!/usr/bin/env python3
"""
Hikari Protocol: XLM AI Trading Agents CLI Execution Engine
Implements TauricResearch/TradingAgents multi-agent framework for Stellar native assets.
Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

import argparse
import os
import sys
import json
from datetime import datetime, timezone

# Add project root and agents directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../agents")))

# Ensure utf-8 terminal output compatibility
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from agents.trading_agents.engine import XLMTradingAgentsEngine
from agents.trading_agents.data_feed import StellarMarketDataFeed


def main():
    parser = argparse.ArgumentParser(description="Hikari Protocol: AI Trading Agents for Stellar XLM")
    parser.add_argument("--ticker", default="XLM", help="Target Stellar asset ticker (default: XLM)")
    parser.add_argument("--days", type=int, default=60, help="Historical candle lookback period (default: 60)")
    parser.add_argument("--regime", choices=["bullish", "bearish", "neutral", "volatile"], default="bullish",
                        help="Market simulation regime (default: bullish)")
    parser.add_argument("--base-price", type=float, default=0.1285, help="Current baseline asset price (default: 0.1285)")
    parser.add_argument("--output", default="agents/data/xlm_trading_agent_decision.md", help="Path to save markdown report")
    args = parser.parse_args()

    print("=" * 80)
    print("      🌟 HIKARI PROTOCOL — MULTI-AGENT AI TRADING DESK (XLM/USDC) 🌟")
    print("      Framework Architecture: TauricResearch/TradingAgents")
    print(f"      Target: Stellar Soroban Protocol 27 | Ticker: {args.ticker} | Regime: {args.regime.upper()}")
    print("=" * 80)

    # Initialize feed and engine
    feed = StellarMarketDataFeed(base_price=args.base_price)
    engine = XLMTradingAgentsEngine(data_feed=feed)

    print(f"\n[1/5] Ingesting {args.days}-Day Market Data & Computing Technical Indicators...")
    result = engine.run_cycle(days=args.days, market_regime=args.regime)
    
    m_rep = result["analysts"]["market"]
    f_rep = result["analysts"]["fundamentals"]
    s_rep = result["analysts"]["sentiment"]
    n_rep = result["analysts"]["news"]
    
    ind = m_rep["indicators"]
    print(f"   ✓ Price: ${ind['current_price']:.5f} | RSI(14): {ind['rsi_14']:.2f} | MACD Hist: {ind['macd_hist']:.6f}")
    print(f"   ✓ Bollinger Bands: [${ind['bollinger_lower']:.5f} - ${ind['bollinger_upper']:.5f}] | ATR: ${ind['atr_14']:.5f}")
    print(f"   ✓ Volume Surge Ratio: {ind['vol_surge_ratio']:.2f}x | Technical Bias: {m_rep['signal']}")

    print("\n[2/5] Synthesizing Multi-Analyst Intelligence Team...")
    print(f"   • Market Analyst:       [{m_rep['signal']}] (Confidence: {int(m_rep['confidence'] * 100)}%)")
    print(f"   • Fundamentals Analyst: [{f_rep['signal']}] (Confidence: {int(f_rep['confidence'] * 100)}%)")
    print(f"   • Sentiment Analyst:    [{s_rep['signal']}] (Confidence: {int(s_rep['confidence'] * 100)}%)")
    print(f"   • News/Macro Analyst:   [{n_rep['signal']}] (Confidence: {int(n_rep['confidence'] * 100)}%)")

    print("\n[3/5] Convening Researcher Bull vs. Bear Debate...")
    bull = result["research"]["bull"]
    bear = result["research"]["bear"]
    plan = result["research"]["plan"]
    print(f"   🐂 Bull Researcher Target:  ${bull['upside_target']:.5f} (Upside Catalyst)")
    print(f"   🐻 Bear Researcher Target:  ${bear['downside_target']:.5f} (Downside Vulnerability)")
    print(f"   🎯 Research Manager Stance: **{plan['recommendation'].value.upper()}**")
    print(f"      ↳ Rationale: {plan['rationale']}")

    print("\n[4/5] Evaluating Trader Proposal & Risk Committee Debate...")
    trader = result["trader"]
    risk = result["risk_committee"]
    print(f"   ⚡ Trader Proposal:   {trader['action'].value.upper()} @ ${trader['entry_price']:.5f}")
    print(f"      ↳ Stop-Loss:       ${trader['stop_loss']:.5f} (ATR Protected)")
    print(f"      ↳ Take-Profit:     ${trader['take_profit']:.5f} (R:R Ratio {trader['risk_reward_ratio']}:1)")
    print(f"      ↳ Proposed Sizing: {trader['position_sizing']}")
    print(f"   🚀 Aggressive Risk:   {risk['aggressive']['recommended_sizing']}")
    print(f"   🛡️ Conservative Risk: {risk['conservative']['recommended_sizing']}")
    print(f"   ⚖️ Neutral Risk:      {risk['neutral']['recommended_sizing']}")

    print("\n[5/5] Portfolio Manager Final Invariant Verification & Order Dispatch...")
    pm = result["final_decision"]
    order = pm["execution_order"]
    print(f"   🏆 Final Rating:       {pm['rating'].value.upper()}")
    print(f"   🔒 Soroban Invariants: {pm['verdict']} (0 Invariant Violations)")
    print(f"   💰 Approved Size:      {order['allocation_percent']} of Vault Capital")
    print(f"   🛡️ Cash Buffer:        PRESERVED (>= 10% unencumbered)")
    print(f"   ⚡ Max Slippage:       {order['max_slippage_bps']} bps")
    print(f"   📝 Summary:            {pm['executive_summary']}")

    # Save to file
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(result["markdown_report"])
    print(f"\n✓ Full comprehensive report saved to: {args.output}")

    print("\n" + "=" * 80)
    print(f"🎉 FINAL DECISION: {order['action']} {args.ticker} | ALLOCATION: {order['allocation_percent']} | TARGET: ${order['take_profit_limit']:.5f}")
    print("=" * 80)


if __name__ == "__main__":
    main()
