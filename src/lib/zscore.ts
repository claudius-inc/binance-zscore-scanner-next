/**
 * Z-Score calculation for price analysis.
 * 
 * Z-Score = (current_value - mean) / std_deviation
 * 
 * A z-score tells you how many standard deviations a value is from the mean.
 * - z = 0: At the mean
 * - z = ±1: Within 1 std dev (68% of data)
 * - z = ±2: Within 2 std dev (95% of data)  
 * - z = ±3: Within 3 std dev (99.7% of data)
 * 
 * Values beyond ±2 are statistically unusual.
 */

import { typicalPrice } from "./vwap";

/**
 * Calculate arithmetic mean.
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate population standard deviation.
 */
export function calculateStd(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  
  const m = mean ?? calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate z-score for a value.
 */
export function calculateZscore(value: number, mean: number, std: number): number | null {
  if (std === 0) return null;
  return (value - mean) / std;
}

/**
 * Calculate historical deviations of price from rolling VWAP.
 */
export function calculateRollingDeviations(
  klines: (string | number)[][],
  vwapHours: number,
  lookbackDays: number = 30
): number[] {
  if (klines.length < vwapHours + 24) {
    return [];
  }

  // Sort klines by time
  const sortedKlines = [...klines].sort((a, b) => Number(a[0]) - Number(b[0]));
  
  const deviations: number[] = [];
  const lookbackHours = lookbackDays * 24;
  
  // Start from the point where we have enough history for VWAP
  const startIdx = Math.max(vwapHours, sortedKlines.length - lookbackHours);
  
  for (let i = startIdx; i < sortedKlines.length; i++) {
    // Get klines for VWAP calculation at this point
    const vwapKlines = sortedKlines.slice(i - vwapHours, i);
    
    if (vwapKlines.length < vwapHours * 0.8) {
      continue;
    }
    
    // Calculate VWAP for this window
    let sumPV = 0;
    let sumV = 0;
    for (const k of vwapKlines) {
      const typical = typicalPrice(
        parseFloat(String(k[2])),
        parseFloat(String(k[3])),
        parseFloat(String(k[4]))
      );
      const volume = parseFloat(String(k[5]));
      sumPV += typical * volume;
      sumV += volume;
    }
    
    if (sumV === 0) continue;
    
    const vwap = sumPV / sumV;
    const close = parseFloat(String(sortedKlines[i][4]));
    const deviation = (close - vwap) / vwap;
    deviations.push(deviation);
  }
  
  return deviations;
}

export interface PriceZscoreResult {
  currentPrice: number | null;
  vwap: number | null;
  deviation: number | null;
  zscore: number | null;
  meanDev: number | null;
  stdDev: number | null;
}

/**
 * Calculate z-score of current price vs VWAP.
 */
export function calculatePriceZscore(
  klines: (string | number)[][],
  vwapHours: number,
  lookbackDays: number = 30
): PriceZscoreResult {
  const emptyResult: PriceZscoreResult = {
    currentPrice: null,
    vwap: null,
    deviation: null,
    zscore: null,
    meanDev: null,
    stdDev: null,
  };
  
  if (!klines || klines.length === 0) {
    return emptyResult;
  }
  
  // Sort and get current price
  const sortedKlines = [...klines].sort((a, b) => Number(a[0]) - Number(b[0]));
  const currentPrice = parseFloat(String(sortedKlines[sortedKlines.length - 1][4]));
  
  // Calculate current VWAP
  const vwapKlines = sortedKlines.slice(-vwapHours);
  let sumPV = 0;
  let sumV = 0;
  for (const k of vwapKlines) {
    const typical = typicalPrice(
      parseFloat(String(k[2])),
      parseFloat(String(k[3])),
      parseFloat(String(k[4]))
    );
    sumPV += typical * parseFloat(String(k[5]));
    sumV += parseFloat(String(k[5]));
  }
  
  if (sumV === 0) {
    return { ...emptyResult, currentPrice };
  }
  
  const vwap = sumPV / sumV;
  const currentDeviation = (currentPrice - vwap) / vwap;
  
  // Calculate historical deviations
  const historicalDevs = calculateRollingDeviations(klines, vwapHours, lookbackDays);
  
  if (historicalDevs.length < 10) {
    return {
      currentPrice,
      vwap,
      deviation: currentDeviation,
      zscore: null,
      meanDev: null,
      stdDev: null,
    };
  }
  
  const meanDev = calculateMean(historicalDevs);
  const stdDev = calculateStd(historicalDevs, meanDev);
  const zscore = calculateZscore(currentDeviation, meanDev, stdDev);
  
  return {
    currentPrice,
    vwap,
    deviation: currentDeviation,
    zscore,
    meanDev,
    stdDev,
  };
}

export interface FundingRateZscoreResult {
  currentRate: number | null;
  zscore: number | null;
  meanRate: number | null;
  stdRate: number | null;
}

/**
 * Calculate z-score of current funding rate.
 */
export function calculateFundingRateZscore(
  fundingRates: { fundingRate: string; fundingTime: number }[],
  lookbackPeriods: number = 90 // ~30 days at 8h intervals
): FundingRateZscoreResult {
  const emptyResult: FundingRateZscoreResult = {
    currentRate: null,
    zscore: null,
    meanRate: null,
    stdRate: null,
  };
  
  if (!fundingRates || fundingRates.length < 10) {
    return emptyResult;
  }
  
  // Sort by time
  const sortedRates = [...fundingRates].sort((a, b) => a.fundingTime - b.fundingTime);
  
  // Get rates as numbers
  const rates = sortedRates
    .slice(-lookbackPeriods)
    .map((r) => parseFloat(r.fundingRate));
  
  const currentRate = rates[rates.length - 1] ?? null;
  
  if (currentRate === null || rates.length < 10) {
    return { ...emptyResult, currentRate };
  }
  
  const meanRate = calculateMean(rates);
  const stdRate = calculateStd(rates, meanRate);
  const zscore = calculateZscore(currentRate, meanRate, stdRate);
  
  return {
    currentRate,
    zscore,
    meanRate,
    stdRate,
  };
}

export interface SymbolAnalysis {
  priceVsVwap2d: PriceZscoreResult;
  priceVsVwap5d: PriceZscoreResult;
  priceVsVwap1w: PriceZscoreResult;
  fundingRate: FundingRateZscoreResult;
}

/**
 * Full z-score analysis for a symbol.
 */
export function analyzeSymbol(
  klines: (string | number)[][],
  fundingRates: { fundingRate: string; fundingTime: number }[],
  lookbackDays: number = 30
): SymbolAnalysis {
  return {
    priceVsVwap2d: calculatePriceZscore(klines, 48, lookbackDays),
    priceVsVwap5d: calculatePriceZscore(klines, 120, lookbackDays),
    priceVsVwap1w: calculatePriceZscore(klines, 168, lookbackDays),
    fundingRate: calculateFundingRateZscore(fundingRates),
  };
}
