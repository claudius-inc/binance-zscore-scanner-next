/**
 * VWAP (Volume Weighted Average Price) calculation.
 * VWAP = Σ(Price × Volume) / Σ(Volume)
 * Uses typical price: (High + Low + Close) / 3
 */

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
}

/**
 * Parse a Binance kline array into a structured object.
 */
export function parseKline(kline: (string | number)[]): Kline {
  return {
    openTime: Number(kline[0]),
    open: parseFloat(String(kline[1])),
    high: parseFloat(String(kline[2])),
    low: parseFloat(String(kline[3])),
    close: parseFloat(String(kline[4])),
    volume: parseFloat(String(kline[5])),
    closeTime: Number(kline[6]),
    quoteVolume: parseFloat(String(kline[7])),
    trades: Number(kline[8]),
  };
}

/**
 * Calculate typical price: (H + L + C) / 3
 */
export function typicalPrice(high: number, low: number, close: number): number {
  return (high + low + close) / 3;
}

/**
 * Calculate VWAP from klines.
 */
export function calculateVwap(klines: (string | number)[][], hours?: number): number | null {
  if (!klines || klines.length === 0) {
    return null;
  }

  let filteredKlines = klines;
  
  // Filter by time if hours specified
  if (hours !== undefined) {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    filteredKlines = klines.filter((k) => Number(k[0]) >= cutoffTime);
  }

  if (filteredKlines.length === 0) {
    return null;
  }

  let sumPV = 0; // Sum of price * volume
  let sumV = 0;  // Sum of volume

  for (const kline of filteredKlines) {
    const parsed = parseKline(kline);
    const tp = typicalPrice(parsed.high, parsed.low, parsed.close);
    sumPV += tp * parsed.volume;
    sumV += parsed.volume;
  }

  if (sumV === 0) {
    return null;
  }

  return sumPV / sumV;
}

/**
 * Calculate 2-day rolling VWAP.
 */
export function calculateVwap2d(klines: (string | number)[][]): number | null {
  return calculateVwap(klines, 48);
}

/**
 * Calculate 5-day rolling VWAP.
 */
export function calculateVwap5d(klines: (string | number)[][]): number | null {
  return calculateVwap(klines, 120);
}

/**
 * Get week boundaries (Monday 00:00 UTC).
 */
export function getWeekBoundaries(referenceTime?: Date): {
  priorWeekStart: Date;
  priorWeekEnd: Date;
  currentWeekStart: Date;
  currentWeekEnd: Date;
} {
  const ref = referenceTime || new Date();
  
  // Find Monday of current week (getDay(): 0=Sunday, 1=Monday, etc.)
  const dayOfWeek = ref.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const currentWeekStart = new Date(ref);
  currentWeekStart.setUTCHours(0, 0, 0, 0);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysSinceMonday);
  
  const priorWeekStart = new Date(currentWeekStart);
  priorWeekStart.setUTCDate(priorWeekStart.getUTCDate() - 7);
  
  const priorWeekEnd = new Date(currentWeekStart);
  
  return {
    priorWeekStart,
    priorWeekEnd,
    currentWeekStart,
    currentWeekEnd: ref,
  };
}

/**
 * Calculate VWAP for the current week (Monday to now).
 */
export function calculateVwapCurrentWeek(klines: (string | number)[][]): number | null {
  if (!klines || klines.length === 0) {
    return null;
  }

  const { currentWeekStart } = getWeekBoundaries();
  const cutoffTime = currentWeekStart.getTime();
  
  const weekKlines = klines.filter((k) => Number(k[0]) >= cutoffTime);
  return weekKlines.length > 0 ? calculateVwap(weekKlines) : null;
}

/**
 * Calculate VWAP for the prior week (Monday to Sunday).
 */
export function calculateVwapPriorWeek(klines: (string | number)[][]): number | null {
  if (!klines || klines.length === 0) {
    return null;
  }

  const { priorWeekStart, priorWeekEnd } = getWeekBoundaries();
  const startTime = priorWeekStart.getTime();
  const endTime = priorWeekEnd.getTime();
  
  const weekKlines = klines.filter((k) => {
    const time = Number(k[0]);
    return time >= startTime && time < endTime;
  });
  
  return weekKlines.length > 0 ? calculateVwap(weekKlines) : null;
}

/**
 * Calculate VWAP for all standard periods.
 */
export function calculateVwapForPeriods(klines: (string | number)[][]): {
  vwap2d: number | null;
  vwap5d: number | null;
  vwapCurrentWeek: number | null;
  vwapPriorWeek: number | null;
} {
  return {
    vwap2d: calculateVwap2d(klines),
    vwap5d: calculateVwap5d(klines),
    vwapCurrentWeek: calculateVwapCurrentWeek(klines),
    vwapPriorWeek: calculateVwapPriorWeek(klines),
  };
}

/**
 * Get the most recent close price from klines.
 */
export function getCurrentPrice(klines: (string | number)[][]): number | null {
  if (!klines || klines.length === 0) {
    return null;
  }
  // Sort by time and get last
  const sorted = [...klines].sort((a, b) => Number(a[0]) - Number(b[0]));
  return parseFloat(String(sorted[sorted.length - 1][4])); // Close price
}
