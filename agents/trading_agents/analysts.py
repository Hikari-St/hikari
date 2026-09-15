"""
Hikari Protocol: AI Trading Agents - Specialist Analyst Team
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

from typing import Dict, Any, List
from .indicators import compute_all_indicators

class MarketAnalyst:
    """
    Technical Market Analyst:
    Examines price structure, moving average alignments (EMA 10/20/50, SMA 50/200),
    momentum (RSI 14, MACD), volatility (Bollinger Bands, ATR 14), and volume (VWMA).
    """

    def analyze(self, ohlcv_data: List[Dict[str, float]]) -> Dict[str, Any]:
        indicators = compute_all_indicators(ohlcv_data)
        current_price = indicators["current_price"]
        rsi = indicators["rsi_14"] or 50.0
        macd_hist = indicators["macd_hist"] or 0.0
        ema_20 = indicators["ema_20"] or current_price
        ema_50 = indicators["ema_50"] or current_price
        bb_upper = indicators["bollinger_upper"] or current_price * 1.05
        bb_lower = indicators["bollinger_lower"] or current_price * 0.95
        atr = indicators["atr_14"] or (current_price * 0.03)

        # Technical signal calculation
        bull_points = 0
        bear_points = 0

        # Trend Checks
        if current_price > ema_20:
            bull_points += 1
        else:
            bear_points += 1

        if ema_20 > ema_50:
            bull_points += 1.5
        else:
            bear_points += 1.5

        # Momentum Checks
        if 40.0 <= rsi <= 65.0:
            bull_points += 1.5  # healthy bullish expansion
        elif rsi > 70.0:
            bear_points += 1.0  # overbought exhaustion warning
        elif rsi < 30.0:
            bull_points += 1.0  # oversold reversal bounce candidate
        else:
            bear_points += 1.0

        # MACD Histogram
        if macd_hist > 0:
            bull_points += 1.5
        else:
            bear_points += 1.5

        # Volume confirmation
        if indicators["vol_surge_ratio"] > 1.2:
            if current_price > ema_20:
                bull_points += 1.0
            else:
                bear_points += 1.0

        total_points = bull_points + bear_points
        bull_ratio = bull_points / total_points if total_points > 0 else 0.5

        if bull_ratio >= 0.65:
            signal = "BULLISH"
            confidence = min(0.92, round(0.60 + bull_ratio * 0.35, 2))
        elif bull_ratio <= 0.35:
            signal = "BEARISH"
            confidence = min(0.92, round(0.60 + (1.0 - bull_ratio) * 0.35, 2))
        else:
            signal = "NEUTRAL"
            confidence = round(0.50 + abs(bull_ratio - 0.50), 2)

        support_level = round(bb_lower, 5)
        resistance_level = round(bb_upper, 5)

        report = f"""### 📊 Technical Market Analyst Report (XLM/USDC)
- **Current Price**: ${current_price:.5f}
- **RSI (14)**: {rsi:.2f} ({"Overbought" if rsi > 70 else "Oversold" if rsi < 30 else "Neutral/Healthy Momentum"})
- **MACD Histogram**: {macd_hist:.6f} ({"Bullish Expansion" if macd_hist > 0 else "Bearish Contraction"})
- **Bollinger Bands**: Lower ${bb_lower:.5f} | Mid ${indicators['bollinger_middle']:.5f} | Upper ${bb_upper:.5f}
- **Average True Range (ATR 14)**: ${atr:.5f} ({((atr / current_price) * 100):.2f}% volatility)
- **Key Support**: ${support_level:.5f} | **Key Resistance**: ${resistance_level:.5f}
- **Technical Bias**: **{signal}** (Confidence: {int(confidence * 100)}%)
"""
        return {
            "analyst": "MarketAnalyst",
            "signal": signal,
            "confidence": confidence,
            "current_price": current_price,
            "atr": atr,
            "support": support_level,
            "resistance": resistance_level,
            "indicators": indicators,
            "report": report.strip()
        }


class FundamentalsAnalyst:
    """
    Stellar Fundamentals Analyst:
    Analyzes Stellar network TPS, SCP consensus health, TVL, and tokenomics.
    """

    def analyze(self, fundamentals: Dict[str, Any]) -> Dict[str, Any]:
        tvl = fundamentals.get("soroban_tvl_usd", 48_500_000)
        payments_vol = fundamentals.get("daily_payments_volume_usd", 68_400_000)
        solvency = fundamentals.get("hikari_solvency_ratio", 1.048)
        blend_total_apr = fundamentals.get("blend_total_apr", 0.142)
        best_yield_apr = fundamentals.get("best_stellar_yield_apr", 0.247)
        best_venue = fundamentals.get("best_yield_venue", "Blend Protocol Backstop Module (bBLND-XLM)")
        mev_boost = fundamentals.get("hikari_mev_boost_apr", 0.032)

        # Fundamentals evaluation
        is_strong = (tvl > 25_000_000) and (payments_vol > 30_000_000) and (solvency >= 1.0)
        signal = "BULLISH" if is_strong else "NEUTRAL"
        confidence = 0.88 if is_strong else 0.60

        report = f"""### 🏛️ Stellar Network Fundamentals & Best Yield Report
- **Asset**: {fundamentals.get('asset')} ({fundamentals.get('name')})
- **Runtime**: {fundamentals.get('network')}
- **Ledger Finality**: {fundamentals.get('average_ledger_close_sec')}s deterministic closes
- **Circulating Supply**: {fundamentals.get('circulating_supply'):,} XLM
- **24h Payment Volume**: ${payments_vol:,.2f} USD
- **Soroban DeFi TVL**: ${tvl:,.2f} USD
- **Blend Money Market APR**: {(blend_total_apr * 100):.2f}% APY (Base + BLND Emissions)
- **🏆 Best Yield in Stellar**: {(best_yield_apr * 100):.2f}% APY ({best_venue})
- **⚡ Hikari MEV Yield Stream**: +{(mev_boost * 100):.2f}% APY (100% streamed to depositors)
- **Hikari Reserve Backing**: {(solvency * 100):.1f}% (Over-collateralized solvent)
- **Fundamental Bias**: **{signal}** (Confidence: {int(confidence * 100)}%)
"""
        return {
            "analyst": "FundamentalsAnalyst",
            "signal": signal,
            "confidence": confidence,
            "metrics": fundamentals,
            "report": report.strip()
        }



class SentimentAnalyst:
    """
    Social Sentiment Analyst:
    Gauges retail and institutional sentiment, trending community narratives, and crowd psychology.
    """

    def analyze(self, sentiment_data: Dict[str, Any]) -> Dict[str, Any]:
        score = sentiment_data.get("social_sentiment_score", 0.70)
        label = sentiment_data.get("sentiment_label", "BULLISH_MOMENTUM")

        if score > 0.30:
            signal = "BULLISH"
            confidence = min(0.90, round(0.50 + score * 0.45, 2))
        elif score < -0.30:
            signal = "BEARISH"
            confidence = min(0.90, round(0.50 + abs(score) * 0.45, 2))
        else:
            signal = "NEUTRAL"
            confidence = 0.60

        topics_str = ", ".join(sentiment_data.get("trending_topics", []))
        report = f"""### 💬 Social Sentiment & Psychology Report
- **Sentiment Index**: {score:+.2f} ({label})
- **Community Momentum**: {"High Bullish Conviction" if score > 0.5 else "Cautious Optimism"}
- **Trending Topics**: {topics_str}
- **Sentiment Bias**: **{signal}** (Confidence: {int(confidence * 100)}%)
"""
        return {
            "analyst": "SentimentAnalyst",
            "signal": signal,
            "confidence": confidence,
            "score": score,
            "report": report.strip()
        }


class NewsAnalyst:
    """
    News & Macro Catalyst Analyst:
    Evaluates protocol releases, liquidity rail expansions, and macroeconomic conditions.
    """

    def analyze(self, news_data: Dict[str, Any]) -> Dict[str, Any]:
        macro = news_data.get("macro_environment", "RISK_ON_EXPANSION")
        events = news_data.get("recent_news_events", [])

        positive_count = sum(1 for e in events if "POSITIVE" in e.get("impact", ""))
        negative_count = sum(1 for e in events if "NEGATIVE" in e.get("impact", ""))

        if positive_count > negative_count:
            signal = "BULLISH"
            confidence = 0.82
        elif negative_count > positive_count:
            signal = "BEARISH"
            confidence = 0.80
        else:
            signal = "NEUTRAL"
            confidence = 0.65

        headlines = "\n".join([f"  • [{e.get('impact')}] {e.get('headline')} ({e.get('source')})" for e in events])
        report = f"""### 📰 News & Macroeconomic Catalyst Report
- **Macro Environment**: {macro}
- **Catalyst Headlines**:
{headlines}
- **News Catalyst Bias**: **{signal}** (Confidence: {int(confidence * 100)}%)
"""
        return {
            "analyst": "NewsAnalyst",
            "signal": signal,
            "confidence": confidence,
            "events_count": len(events),
            "report": report.strip()
        }
