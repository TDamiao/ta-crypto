# Compatibility

`ta-crypto` uses two different kinds of evidence:

1. Golden fixtures detect changes from the project's recorded outputs.
2. External comparisons evaluate selected indicators against TA-Lib, `technicalindicators`, and pandas-ta.

Golden parity is regression protection. It is not independent proof that a formula is correct.

## Policy source

Tolerance, burn-in, alignment, and blocking-reference settings live in [`scripts/compat-policy.json`](../scripts/compat-policy.json).

Reference series are left-padded to input length. Comparisons begin at the configured burn-in and include only overlapping non-null values.

## Current external matrix

| Indicator | Burn-in | Tolerance | Blocking references | Non-blocking reference |
| --- | ---: | ---: | --- | --- |
| SMA(14) | 14 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| EMA(14) | 14 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| RSI(14) | 28 | `5e-2` | TA-Lib, `technicalindicators` | pandas-ta |
| MACD(12,26,9) | 80 | `2e-2` | TA-Lib, `technicalindicators` | pandas-ta |
| BBANDS(20,2) | 20 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| ATR(14) | 56 | `1.5e-1` | TA-Lib, `technicalindicators` | pandas-ta |
| ADX/+DI/-DI(14) | 90 | `1.5` | TA-Lib, `technicalindicators` | pandas-ta |

TA-Lib and `technicalindicators` are blocking checks in CI. pandas-ta is environment-dependent telemetry and may warn or skip without passing a blocking mismatch.

## Why ATR and ADX use burn-in

The current ATR uses a project-local RMA initialized from the first `period` true-range values and first emits at index `period - 1`.

The current ADX derives directional movement and true range, applies the same RMA style, and first permits output at index `period - 1`. Other libraries commonly delay ADX longer and initialize intermediate series differently.

The external matrix therefore compares ATR and ADX only after extended burn-in. Before that point, outputs from different libraries should not be assumed interchangeable.

## Golden coverage

The golden fixture currently locks:

- SMA, EMA, RSI, MACD, BBANDS, ATR, and ADX;
- session VWAP;
- stateful RSI and session VWAP values;
- batch/stateful parity for current stateful constructors through tests.

The shared tolerance used by the golden/stateful assertions is generally `1e-10`.

## Run the checks

```bash
npm run test:golden
npm run test:compat:technicalindicators
```

For Python references:

```bash
python -m pip install -r scripts/requirements-compat.txt
npm run test:compat:python
```

CI uses Linux and Python 3.12 for the full Python compatibility job. Local availability of TA-Lib and pandas-ta depends on platform packages and wheels.

## Current coverage limits

External compatibility does not yet cover every exported indicator or multiple market-shape fixtures. NATR, returns, MFI, periodic VWAP, realized volatility, and crypto-specific indicators need additional independent evidence.

Expansion of the matrix, clearer initialization evidence, and policy/vector consistency checks are tracked in [issue #20](https://github.com/TDamiao/ta-crypto/issues/20).

## Related pages

- [Indicators](indicators.md)
- [Stateful API](stateful.md)
- [Trust and verification](trust.md)
