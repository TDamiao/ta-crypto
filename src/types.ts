export type NumericSeries = number[];

export type Series = Array<number | null>;

export type Candle = {
  time?: number | string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
