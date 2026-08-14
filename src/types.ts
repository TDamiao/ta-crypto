export type NumericSeries = number[];
export type Series = Array<number | null>;
export type TimeValue = number | string | Date;

export type CandleObject = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: TimeValue;
};

export type CandleAlias = {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  t?: TimeValue;
};

export type Candle = CandleObject | CandleAlias;

export type OHLCV = {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  time: Array<TimeValue | undefined>;
};

export type OHLCVAlias = {
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v?: number[];
  t?: Array<TimeValue | undefined>;
};

export type OHLCVInput = OHLCV | OHLCVAlias;
export type PriceInput = NumericSeries | Candle[];

export type PercentReturnMode = "periodic" | "compound" | "sum";

export interface PercentReturnOptions {
  /**
   * Return calculation mode:
   * - "periodic": Consecutive simple return (values[i] / values[i-1] - 1). Default.
   * - "compound": Compounded cumulative return from initial price (values[i] / values[0] - 1).
   * - "sum": Arithmetic sum of periodic simple returns.
   */
  mode?: PercentReturnMode;
  /**
   * When true, calculates compounded cumulative return. Equivalent to mode: "compound".
   */
  cumulative?: boolean;
}

export type StatefulIndicator<TIn, TOut> = {
  next(value: TIn): TOut;
  reset(): void;
};

export type VWAPSessionInput = {
  high: number;
  low: number;
  close: number;
  volume: number;
  sessionId: string | number;
};

export type ATRInput = {
  high: number;
  low: number;
  close: number;
} | {
  h: number;
  l: number;
  c: number;
};

export type OrderflowInput = {
  open: number;
  close: number;
  volume: number;
} | {
  o: number;
  c: number;
  v: number;
};

export type MACDOutput = {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};

export type BBANDSOutput = {
  basis: number | null;
  upper: number | null;
  lower: number | null;
};
