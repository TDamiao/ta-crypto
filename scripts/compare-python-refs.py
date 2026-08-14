import json
import os
import sys
from pathlib import Path

try:
    import numpy as np
    import pandas as pd
    DEP_ERROR = None
except Exception as exc:  # pragma: no cover - environment dependent
    np = None
    pd = None
    DEP_ERROR = exc

try:
    import talib
    TALIB_ERROR = None
except Exception as exc:  # pragma: no cover - environment dependent
    talib = None
    TALIB_ERROR = exc

try:
    import pandas_ta as pta
    PANDAS_TA_ERROR = None
except Exception as exc:  # pragma: no cover - environment dependent
    pta = None
    PANDAS_TA_ERROR = exc

ROOT = Path(__file__).resolve().parents[1]
COMPAT_PATH = ROOT / "test" / "fixtures" / "compat-current.json"
POLICY_PATH = ROOT / "scripts" / "compat-policy.json"
POLICY = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
TOL = {k: float(v["tolerance"]) for k, v in POLICY["indicators"].items()}
BURN = {k: int(v["burnIn"]) for k, v in POLICY["indicators"].items()}


def as_arr(values):
    return np.array([np.nan if v is None else float(v) for v in values], dtype=np.float64)


def compare(scenario_name, name, ours, ref, tol, burn, blocking=True):
    ours_arr = as_arr(ours)
    ref_arr = np.array(ref, dtype=np.float64)

    if ref_arr.shape[0] != ours_arr.shape[0]:
        return False, f"[{scenario_name}] {name}: length mismatch ours={ours_arr.shape[0]} ref={ref_arr.shape[0]}", blocking

    idx = np.arange(ours_arr.shape[0])
    mask = (idx >= burn) & ~np.isnan(ours_arr) & ~np.isnan(ref_arr)
    points = int(mask.sum())
    if points == 0:
        return False, f"[{scenario_name}] {name}: no overlapping points after burn-in={burn}", blocking

    diff = np.abs(ours_arr[mask] - ref_arr[mask])
    max_diff = float(np.max(diff)) if diff.size else 0.0
    ok = max_diff <= tol
    return ok, f"[{scenario_name}] {name}: {'OK' if ok else 'FAIL'} (maxDiff={max_diff}, tol={tol}, points={points})", blocking


def col(df, prefix):
    for c in df.columns:
        if c.startswith(prefix):
            return df[c].to_numpy(dtype=np.float64)
    raise RuntimeError(f"missing column prefix {prefix} in {list(df.columns)}")


def main():
    if np is None or pd is None:
        print(f"[compat][python] Python dependencies unavailable: {DEP_ERROR}")
        print("[compat][python] install requirements: pip install -r scripts/requirements-compat.txt")
        sys.exit(1)

    if talib is None:
        print(f"[compat][python] TA-Lib unavailable: {TALIB_ERROR}")
        print("[compat][python] install requirements: pip install -r scripts/requirements-compat.txt")
        sys.exit(1)

    data = json.loads(COMPAT_PATH.read_text(encoding="utf-8"))
    scenario_keys = data.get("meta", {}).get("scenarios", ["cycle"])
    scenarios_data = data.get("scenarios", {"cycle": {"input": data.get("input"), "ours": data.get("ours")}})

    checks = []

    for scenario_key in scenario_keys:
        scenario = scenarios_data[scenario_key]
        inp = scenario["input"]
        ours = scenario["ours"]

        close = np.array(inp["close"], dtype=np.float64)
        high = np.array(inp["high"], dtype=np.float64)
        low = np.array(inp["low"], dtype=np.float64)
        volume = np.array(inp["volume"], dtype=np.float64)

        # 1. SMA(14)
        checks.append(compare(scenario_key, "TA-Lib SMA(14)", ours["sma14"], talib.SMA(close, timeperiod=14), TOL["sma"], BURN["sma"], blocking=True))

        # 2. EMA(14)
        checks.append(compare(scenario_key, "TA-Lib EMA(14)", ours["ema14"], talib.EMA(close, timeperiod=14), TOL["ema"], BURN["ema"], blocking=True))

        # 3. RSI(14)
        checks.append(compare(scenario_key, "TA-Lib RSI(14)", ours["rsi14"], talib.RSI(close, timeperiod=14), TOL["rsi"], BURN["rsi"], blocking=True))

        # 4. MACD(12, 26, 9)
        macd, signal, hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
        checks.append(compare(scenario_key, "TA-Lib MACD line", ours["macd"]["macd"], macd, TOL["macd"], BURN["macd"], blocking=True))
        checks.append(compare(scenario_key, "TA-Lib MACD signal", ours["macd"]["signal"], signal, TOL["macd"], BURN["macd"], blocking=True))
        checks.append(compare(scenario_key, "TA-Lib MACD histogram", ours["macd"]["histogram"], hist, TOL["macd"], BURN["macd"], blocking=True))

        # 5. BBANDS(20, 2)
        upper, middle, lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2, matype=0)
        checks.append(compare(scenario_key, "TA-Lib BBANDS basis", ours["bbands20_2"]["basis"], middle, TOL["bbands"], BURN["bbands"], blocking=True))
        checks.append(compare(scenario_key, "TA-Lib BBANDS upper", ours["bbands20_2"]["upper"], upper, TOL["bbands"], BURN["bbands"], blocking=True))
        checks.append(compare(scenario_key, "TA-Lib BBANDS lower", ours["bbands20_2"]["lower"], lower, TOL["bbands"], BURN["bbands"], blocking=True))

        # 6. ATR(14)
        checks.append(compare(scenario_key, "TA-Lib ATR(14)", ours["atr14"], talib.ATR(high, low, close, timeperiod=14), TOL["atr"], BURN["atr"], blocking=True))

        # 7. NATR(14)
        checks.append(compare(scenario_key, "TA-Lib NATR(14)", ours["natr14"], talib.NATR(high, low, close, timeperiod=14), TOL["natr"], BURN["natr"], blocking=True))

        # 8. ADX(14), +DI(14), -DI(14)
        checks.append(compare(scenario_key, "TA-Lib ADX(14)", ours["adx14"]["adx"], talib.ADX(high, low, close, timeperiod=14), TOL["adx"], BURN["adx"], blocking=True))
        checks.append(compare(scenario_key, "TA-Lib +DI(14)", ours["adx14"]["plusDI"], talib.PLUS_DI(high, low, close, timeperiod=14), TOL["adx"], BURN["adx"], blocking=True))
        checks.append(compare(scenario_key, "TA-Lib -DI(14)", ours["adx14"]["minusDI"], talib.MINUS_DI(high, low, close, timeperiod=14), TOL["adx"], BURN["adx"], blocking=True))

        # 9. OBV
        checks.append(compare(scenario_key, "TA-Lib OBV", ours["obv"], talib.OBV(close, volume), TOL["obv"], BURN["obv"], blocking=True))

        # 10. MFI(14)
        checks.append(compare(scenario_key, "TA-Lib MFI(14)", ours["mfi14"], talib.MFI(high, low, close, volume, timeperiod=14), TOL["mfi"], BURN["mfi"], blocking=True))

        if pta is not None:
            try:
                close_s = pd.Series(close, dtype="float64")
                high_s = pd.Series(high, dtype="float64")
                low_s = pd.Series(low, dtype="float64")
                volume_s = pd.Series(volume, dtype="float64")

                checks.append(compare(scenario_key, "pandas-ta SMA(14)", ours["sma14"], pta.sma(close_s, length=14).to_numpy(dtype=np.float64), TOL["sma"], BURN["sma"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta EMA(14)", ours["ema14"], pta.ema(close_s, length=14).to_numpy(dtype=np.float64), TOL["ema"], BURN["ema"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta RSI(14)", ours["rsi14"], pta.rsi(close_s, length=14).to_numpy(dtype=np.float64), TOL["rsi"], BURN["rsi"], blocking=False))

                mdf = pta.macd(close_s, fast=12, slow=26, signal=9)
                checks.append(compare(scenario_key, "pandas-ta MACD line", ours["macd"]["macd"], col(mdf, "MACD_"), TOL["macd"], BURN["macd"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta MACD signal", ours["macd"]["signal"], col(mdf, "MACDs_"), TOL["macd"], BURN["macd"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta MACD histogram", ours["macd"]["histogram"], col(mdf, "MACDh_"), TOL["macd"], BURN["macd"], blocking=False))

                bdf = pta.bbands(close_s, length=20, std=2)
                checks.append(compare(scenario_key, "pandas-ta BBANDS basis", ours["bbands20_2"]["basis"], col(bdf, "BBM_"), TOL["bbands"], BURN["bbands"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta BBANDS upper", ours["bbands20_2"]["upper"], col(bdf, "BBU_"), TOL["bbands"], BURN["bbands"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta BBANDS lower", ours["bbands20_2"]["lower"], col(bdf, "BBL_"), TOL["bbands"], BURN["bbands"], blocking=False))

                checks.append(compare(scenario_key, "pandas-ta ATR(14)", ours["atr14"], pta.atr(high_s, low_s, close_s, length=14).to_numpy(dtype=np.float64), TOL["atr"], BURN["atr"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta NATR(14)", ours["natr14"], pta.natr(high_s, low_s, close_s, length=14).to_numpy(dtype=np.float64), TOL["natr"], BURN["natr"], blocking=False))

                adf = pta.adx(high_s, low_s, close_s, length=14)
                checks.append(compare(scenario_key, "pandas-ta ADX(14)", ours["adx14"]["adx"], col(adf, "ADX_"), TOL["adx"], BURN["adx"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta +DI(14)", ours["adx14"]["plusDI"], col(adf, "DMP_"), TOL["adx"], BURN["adx"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta -DI(14)", ours["adx14"]["minusDI"], col(adf, "DMN_"), TOL["adx"], BURN["adx"], blocking=False))

                checks.append(compare(scenario_key, "pandas-ta OBV", ours["obv"], pta.obv(close_s, volume_s).to_numpy(dtype=np.float64), TOL["obv"], BURN["obv"], blocking=False))
                checks.append(compare(scenario_key, "pandas-ta MFI(14)", ours["mfi14"], pta.mfi(high_s, low_s, close_s, volume_s, length=14).to_numpy(dtype=np.float64), TOL["mfi"], BURN["mfi"], blocking=False))
            except Exception as exc:  # pragma: no cover - environment dependent
                print(f"[compat][python] pandas-ta runtime issue on {scenario_key}: {exc} (non-blocking)")
        else:
            msg = f"[compat][python] pandas-ta unavailable: {PANDAS_TA_ERROR}"
            if os.name == "nt":
                print(f"{msg} (Windows skip; validated TA-Lib only)")
            else:
                print(msg)
                sys.exit(1)

    failed = 0
    for ok, msg, blocking in checks:
        if not ok and not blocking:
            print(f"[compat][python] WARN {msg} (non-blocking)")
            continue
        print(f"[compat][python] {msg}")
        if not ok and blocking:
            failed += 1

    if failed:
        print(f"\n[compat][python] completed with {failed} failure(s)")
        sys.exit(1)

    print("\n[compat][python] all multi-scenario comparisons passed")


if __name__ == "__main__":
    main()
