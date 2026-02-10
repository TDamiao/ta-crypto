import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import talib

try:
    import pandas_ta as pta
    PANDAS_TA_ERROR = None
except Exception as exc:  # pragma: no cover - environment dependent
    pta = None
    PANDAS_TA_ERROR = exc

ROOT = Path(__file__).resolve().parents[1]
COMPAT_PATH = ROOT / "test" / "fixtures" / "compat-current.json"

TOL = {
    "sma": 1e-10,
    "ema": 1e-10,
    "rsi": 5e-2,
    "macd": 2e-2,
    "bbands": 1e-10,
    "atr": 1.5e-1,
    "adx": 1.5,
}

BURN = {
    "sma": 14,
    "ema": 14,
    "rsi": 28,
    "macd": 80,
    "bbands": 20,
    "atr": 56,
    "adx": 90,
}


def as_arr(values):
    return np.array([np.nan if v is None else float(v) for v in values], dtype=np.float64)


def compare(name, ours, ref, tol, burn):
    ours_arr = as_arr(ours)
    ref_arr = np.array(ref, dtype=np.float64)

    if ref_arr.shape[0] != ours_arr.shape[0]:
        return False, f"{name}: length mismatch ours={ours_arr.shape[0]} ref={ref_arr.shape[0]}"

    idx = np.arange(ours_arr.shape[0])
    mask = (idx >= burn) & ~np.isnan(ours_arr) & ~np.isnan(ref_arr)
    points = int(mask.sum())
    if points == 0:
        return False, f"{name}: no overlapping points after burn-in={burn}"

    diff = np.abs(ours_arr[mask] - ref_arr[mask])
    max_diff = float(np.max(diff)) if diff.size else 0.0
    ok = max_diff <= tol
    return ok, f"{name}: {'OK' if ok else 'FAIL'} (maxDiff={max_diff}, tol={tol}, points={points})"


def col(df, prefix):
    for c in df.columns:
        if c.startswith(prefix):
            return df[c].to_numpy(dtype=np.float64)
    raise RuntimeError(f"missing column prefix {prefix} in {list(df.columns)}")


def main():
    data = json.loads(COMPAT_PATH.read_text(encoding="utf-8"))
    inp = data["input"]
    ours = data["ours"]

    close = np.array(inp["close"], dtype=np.float64)
    high = np.array(inp["high"], dtype=np.float64)
    low = np.array(inp["low"], dtype=np.float64)

    checks = []
    checks.append(compare("TA-Lib SMA(14)", ours["sma14"], talib.SMA(close, timeperiod=14), TOL["sma"], BURN["sma"]))
    checks.append(compare("TA-Lib EMA(14)", ours["ema14"], talib.EMA(close, timeperiod=14), TOL["ema"], BURN["ema"]))
    checks.append(compare("TA-Lib RSI(14)", ours["rsi14"], talib.RSI(close, timeperiod=14), TOL["rsi"], BURN["rsi"]))

    macd, signal, hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
    checks.append(compare("TA-Lib MACD line", ours["macd"]["macd"], macd, TOL["macd"], BURN["macd"]))
    checks.append(compare("TA-Lib MACD signal", ours["macd"]["signal"], signal, TOL["macd"], BURN["macd"]))
    checks.append(compare("TA-Lib MACD histogram", ours["macd"]["histogram"], hist, TOL["macd"], BURN["macd"]))

    upper, middle, lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2, matype=0)
    checks.append(compare("TA-Lib BBANDS basis", ours["bbands20_2"]["basis"], middle, TOL["bbands"], BURN["bbands"]))
    checks.append(compare("TA-Lib BBANDS upper", ours["bbands20_2"]["upper"], upper, TOL["bbands"], BURN["bbands"]))
    checks.append(compare("TA-Lib BBANDS lower", ours["bbands20_2"]["lower"], lower, TOL["bbands"], BURN["bbands"]))

    checks.append(compare("TA-Lib ATR(14)", ours["atr14"], talib.ATR(high, low, close, timeperiod=14), TOL["atr"], BURN["atr"]))
    checks.append(compare("TA-Lib ADX(14)", ours["adx14"]["adx"], talib.ADX(high, low, close, timeperiod=14), TOL["adx"], BURN["adx"]))
    checks.append(compare("TA-Lib +DI(14)", ours["adx14"]["plusDI"], talib.PLUS_DI(high, low, close, timeperiod=14), TOL["adx"], BURN["adx"]))
    checks.append(compare("TA-Lib -DI(14)", ours["adx14"]["minusDI"], talib.MINUS_DI(high, low, close, timeperiod=14), TOL["adx"], BURN["adx"]))

    if pta is not None:
        try:
            close_s = pd.Series(close, dtype="float64")
            high_s = pd.Series(high, dtype="float64")
            low_s = pd.Series(low, dtype="float64")

            checks.append(compare("pandas-ta SMA(14)", ours["sma14"], pta.sma(close_s, length=14).to_numpy(dtype=np.float64), TOL["sma"], BURN["sma"]))
            checks.append(compare("pandas-ta EMA(14)", ours["ema14"], pta.ema(close_s, length=14).to_numpy(dtype=np.float64), TOL["ema"], BURN["ema"]))
            checks.append(compare("pandas-ta RSI(14)", ours["rsi14"], pta.rsi(close_s, length=14).to_numpy(dtype=np.float64), TOL["rsi"], BURN["rsi"]))

            mdf = pta.macd(close_s, fast=12, slow=26, signal=9)
            checks.append(compare("pandas-ta MACD line", ours["macd"]["macd"], col(mdf, "MACD_"), TOL["macd"], BURN["macd"]))
            checks.append(compare("pandas-ta MACD signal", ours["macd"]["signal"], col(mdf, "MACDs_"), TOL["macd"], BURN["macd"]))
            checks.append(compare("pandas-ta MACD histogram", ours["macd"]["histogram"], col(mdf, "MACDh_"), TOL["macd"], BURN["macd"]))

            bdf = pta.bbands(close_s, length=20, std=2)
            checks.append(compare("pandas-ta BBANDS basis", ours["bbands20_2"]["basis"], col(bdf, "BBM_"), TOL["bbands"], BURN["bbands"]))
            checks.append(compare("pandas-ta BBANDS upper", ours["bbands20_2"]["upper"], col(bdf, "BBU_"), TOL["bbands"], BURN["bbands"]))
            checks.append(compare("pandas-ta BBANDS lower", ours["bbands20_2"]["lower"], col(bdf, "BBL_"), TOL["bbands"], BURN["bbands"]))

            checks.append(compare("pandas-ta ATR(14)", ours["atr14"], pta.atr(high_s, low_s, close_s, length=14).to_numpy(dtype=np.float64), TOL["atr"], BURN["atr"]))
            adf = pta.adx(high_s, low_s, close_s, length=14)
            checks.append(compare("pandas-ta ADX(14)", ours["adx14"]["adx"], col(adf, "ADX_"), TOL["adx"], BURN["adx"]))
            checks.append(compare("pandas-ta +DI(14)", ours["adx14"]["plusDI"], col(adf, "DMP_"), TOL["adx"], BURN["adx"]))
            checks.append(compare("pandas-ta -DI(14)", ours["adx14"]["minusDI"], col(adf, "DMN_"), TOL["adx"], BURN["adx"]))
        except Exception as exc:  # pragma: no cover - environment dependent
            print(f"[compat][python] pandas-ta runtime issue: {exc} (non-blocking)")
    else:
        msg = f"[compat][python] pandas-ta unavailable: {PANDAS_TA_ERROR}"
        if os.name == "nt":
            print(f"{msg} (Windows skip; validated TA-Lib only)")
        else:
            print(msg)
            sys.exit(1)

    failed = 0
    for ok, msg in checks:
        print(f"[compat][python] {msg}")
        if not ok:
            failed += 1

    if failed:
        print(f"[compat][python] completed with {failed} failure(s)")
        sys.exit(1)

    print("[compat][python] all comparisons passed")


if __name__ == "__main__":
    main()
