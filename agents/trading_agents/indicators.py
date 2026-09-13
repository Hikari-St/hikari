"""
Hikari Protocol: AI Trading Agents - Technical Indicators Engine
Adapted from TauricResearch/TradingAgents for Stellar XLM.
Lead Architect: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
"""

import math
from typing import List, Dict, Any, Optional

def calculate_sma(prices: List[float], period: int) -> List[Optional[float]]:
    """Calculates Simple Moving Average (SMA)."""
    sma: List[Optional[float]] = []
    for i in range(len(prices)):
        if i < period - 1:
            sma.append(None)
        else:
            window = prices[i - period + 1 : i + 1]
            sma.append(sum(window) / period)
    return sma

def calculate_ema(prices: List[float], period: int) -> List[Optional[float]]:
    """Calculates Exponential Moving Average (EMA)."""
    ema: List[Optional[float]] = []
    multiplier = 2.0 / (period + 1)
    
    # First EMA is SMA of first 'period' elements
    if len(prices) < period:
        return [None] * len(prices)
        
    for i in range(len(prices)):
        if i < period - 1:
            ema.append(None)
        elif i == period - 1:
            initial_sma = sum(prices[:period]) / period
            ema.append(initial_sma)
        else:
            prev_ema = ema[-1]
            curr_ema = (prices[i] - prev_ema) * multiplier + prev_ema
            ema.append(curr_ema)
    return ema

def calculate_rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
    """Calculates Relative Strength Index (RSI)."""
    if len(prices) <= period:
        return [None] * len(prices)
        
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    gains = [max(d, 0.0) for d in deltas]
    losses = [max(-d, 0.0) for d in deltas]
    
    rsi: List[Optional[float]] = [None]  # first index has no delta
    
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    for _ in range(period - 1):
        rsi.append(None)
        
    if avg_loss == 0:
        rsi.append(100.0)
    else:
        rs = avg_gain / avg_loss
        rsi.append(100.0 - (100.0 / (1.0 + rs)))
        
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        if avg_loss == 0:
            rsi.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi.append(100.0 - (100.0 / (1.0 + rs)))
            
    return rsi

def calculate_macd(prices: List[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Dict[str, List[Optional[float]]]:
    """Calculates MACD line, Signal line, and Histogram."""
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    
    macd_line: List[Optional[float]] = []
    for f, s in zip(fast_ema, slow_ema):
        if f is not None and s is not None:
            macd_line.append(f - s)
        else:
            macd_line.append(None)
            
    # Calculate Signal line (EMA of MACD line valid entries)
    valid_macd = [v for v in macd_line if v is not None]
    signal_valid = calculate_ema(valid_macd, signal_period) if len(valid_macd) >= signal_period else [None] * len(valid_macd)
    
    # Pad signal line to match original length
    none_count = len(macd_line) - len(valid_macd)
    signal_line: List[Optional[float]] = [None] * none_count + signal_valid
    
    macd_hist: List[Optional[float]] = []
    for m, s in zip(macd_line, signal_line):
        if m is not None and s is not None:
            macd_hist.append(m - s)
        else:
            macd_hist.append(None)
            
    return {
        "macd": macd_line,
        "signal": signal_line,
        "hist": macd_hist
    }

def calculate_bollinger_bands(prices: List[float], period: int = 20, num_std: float = 2.0) -> Dict[str, List[Optional[float]]]:
    """Calculates Bollinger Bands (Middle, Upper, Lower, %B)."""
    sma = calculate_sma(prices, period)
    upper: List[Optional[float]] = []
    lower: List[Optional[float]] = []
    percent_b: List[Optional[float]] = []
    
    for i in range(len(prices)):
        if i < period - 1 or sma[i] is None:
            upper.append(None)
            lower.append(None)
            percent_b.append(None)
        else:
            window = prices[i - period + 1 : i + 1]
            mean = sma[i]
            variance = sum((x - mean) ** 2 for x in window) / period
            std_dev = math.sqrt(variance)
            
            u = mean + num_std * std_dev
            l = mean - num_std * std_dev
            upper.append(u)
            lower.append(l)
            
            pb = (prices[i] - l) / (u - l) if (u - l) > 0 else 0.5
            percent_b.append(pb)
            
    return {
        "middle": sma,
        "upper": upper,
        "lower": lower,
        "percent_b": percent_b
    }

def calculate_atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> List[Optional[float]]:
    """Calculates Average True Range (ATR) for volatility and stop-loss placement."""
    if len(closes) < 2:
        return [None] * len(closes)
        
    true_ranges: List[float] = [highs[0] - lows[0]]
    for i in range(1, len(closes)):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1])
        )
        true_ranges.append(tr)
        
    atr: List[Optional[float]] = []
    if len(true_ranges) < period:
        return [None] * len(closes)
        
    for i in range(len(true_ranges)):
        if i < period - 1:
            atr.append(None)
        elif i == period - 1:
            atr.append(sum(true_ranges[:period]) / period)
        else:
            prev_atr = atr[-1]
            curr_atr = (prev_atr * (period - 1) + true_ranges[i]) / period
            atr.append(curr_atr)
            
    return atr

def calculate_vwma(prices: List[float], volumes: List[float], period: int = 20) -> List[Optional[float]]:
    """Calculates Volume Weighted Moving Average (VWMA)."""
    vwma: List[Optional[float]] = []
    for i in range(len(prices)):
        if i < period - 1:
            vwma.append(None)
        else:
            p_slice = prices[i - period + 1 : i + 1]
            v_slice = volumes[i - period + 1 : i + 1]
            total_vol = sum(v_slice)
            if total_vol > 0:
                weighted_sum = sum(p * v for p, v in zip(p_slice, v_slice))
                vwma.append(weighted_sum / total_vol)
            else:
                vwma.append(sum(p_slice) / period)
    return vwma

def compute_all_indicators(ohlcv_data: List[Dict[str, float]]) -> Dict[str, Any]:
    """
    Takes a list of OHLCV candles [{'open': ..., 'high': ..., 'low': ..., 'close': ..., 'volume': ...}]
    and returns a comprehensive technical snapshot corresponding to TradingAgents' Market Analyst.
    """
    closes = [c["close"] for c in ohlcv_data]
    highs = [c["high"] for c in ohlcv_data]
    lows = [c["low"] for c in ohlcv_data]
    volumes = [c["volume"] for c in ohlcv_data]
    
    current_close = closes[-1] if closes else 0.0
    
    sma_50 = calculate_sma(closes, min(50, len(closes)))
    sma_200 = calculate_sma(closes, min(200, len(closes)))
    ema_10 = calculate_ema(closes, min(10, len(closes)))
    ema_20 = calculate_ema(closes, min(20, len(closes)))
    ema_50 = calculate_ema(closes, min(50, len(closes)))
    
    rsi = calculate_rsi(closes, min(14, len(closes) - 1))
    macd = calculate_macd(closes)
    bb = calculate_bollinger_bands(closes, min(20, len(closes)))
    atr = calculate_atr(highs, lows, closes, min(14, len(closes) - 1))
    vwma = calculate_vwma(closes, volumes, min(20, len(closes)))
    
    # 24h volume surge ratio compared to 7d average volume
    recent_vol = volumes[-1] if volumes else 0.0
    avg_vol_7d = sum(volumes[-7:]) / min(7, len(volumes)) if volumes else 1.0
    vol_surge_ratio = (recent_vol / avg_vol_7d) if avg_vol_7d > 0 else 1.0
    
    latest_idx = -1
    return {
        "current_price": current_close,
        "sma_50": sma_50[latest_idx],
        "sma_200": sma_200[latest_idx],
        "ema_10": ema_10[latest_idx],
        "ema_20": ema_20[latest_idx],
        "ema_50": ema_50[latest_idx],
        "rsi_14": rsi[latest_idx],
        "macd_line": macd["macd"][latest_idx],
        "macd_signal": macd["signal"][latest_idx],
        "macd_hist": macd["hist"][latest_idx],
        "bollinger_upper": bb["upper"][latest_idx],
        "bollinger_middle": bb["middle"][latest_idx],
        "bollinger_lower": bb["lower"][latest_idx],
        "bollinger_percent_b": bb["percent_b"][latest_idx],
        "atr_14": atr[latest_idx],
        "vwma_20": vwma[latest_idx],
        "vol_surge_ratio": vol_surge_ratio,
        "trend_bias": "BULLISH" if current_close > (ema_20[latest_idx] or current_close) and (rsi[latest_idx] or 50) > 50 else "BEARISH"
    }
