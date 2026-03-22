/**
 * API Route: Fetch and analyze all Binance perp symbols.
 * GET /api/data
 */

import { NextResponse } from "next/server";
import { getAllPerpSymbols, getAllTickers24h, fetchAllSymbolsData, type SymbolData } from "@/lib/binance";
import { analyzeSymbol } from "@/lib/zscore";
import { calculateVwapForPeriods, getCurrentPrice } from "@/lib/vwap";
import { getSector } from "@/lib/sectors";
import type { SymbolRow } from "@/lib/types";

// Cache the data in memory (revalidated every 60s by fetch)
let cachedData: SymbolRow[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 60 seconds

async function loadScannerData(): Promise<SymbolRow[]> {
  // Check memory cache
  const now = Date.now();
  if (cachedData && now - lastCacheTime < CACHE_TTL) {
    return cachedData;
  }

  // Get all symbols
  const symbols = await getAllPerpSymbols();
  
  // Fetch 24h tickers for volume/price data
  const tickers = await getAllTickers24h();
  
  // Fetch detailed data for each symbol (in batches)
  const allData = await fetchAllSymbolsData(symbols, 720, 15);
  
  // Process into rows
  const rows: SymbolRow[] = [];
  
  for (const symbol of symbols) {
    const data = allData.get(symbol);
    const ticker = tickers.get(symbol);
    
    if (!data || data.error || !data.klines || data.klines.length === 0) {
      continue;
    }
    
    // Calculate z-scores
    const analysis = analyzeSymbol(data.klines, data.fundingRates, 30);
    
    // Calculate VWAPs for current/prior week views
    const vwaps = calculateVwapForPeriods(data.klines);
    const currentPrice = getCurrentPrice(data.klines);
    
    // Calculate additional z-scores for week views
    let zscoreCurrentWeek: number | null = null;
    let zscorePriorWeek: number | null = null;
    
    if (currentPrice && vwaps.vwapCurrentWeek) {
      const dev = (currentPrice - vwaps.vwapCurrentWeek) / vwaps.vwapCurrentWeek;
      zscoreCurrentWeek = dev * 100; // Convert to percentage deviation
    }
    
    if (currentPrice && vwaps.vwapPriorWeek) {
      const dev = (currentPrice - vwaps.vwapPriorWeek) / vwaps.vwapPriorWeek;
      zscorePriorWeek = dev * 100;
    }
    
    const openInterestValue = data.openInterest
      ? parseFloat(data.openInterest.openInterest) * (currentPrice || 0)
      : 0;
    
    rows.push({
      symbol,
      sector: getSector(symbol),
      currentPrice,
      volume24h: ticker ? parseFloat(ticker.quoteVolume) : 0,
      openInterest: openInterestValue,
      priceChange24h: ticker ? parseFloat(ticker.priceChangePercent) : 0,
      zscore2d: analysis.priceVsVwap2d.zscore,
      zscore5d: analysis.priceVsVwap5d.zscore,
      zscore1w: analysis.priceVsVwap1w.zscore,
      zscoreFunding: analysis.fundingRate.zscore,
      zscoreCurrentWeek,
      zscorePriorWeek,
      vwap2d: analysis.priceVsVwap2d.vwap,
      vwap5d: analysis.priceVsVwap5d.vwap,
      fundingRate: analysis.fundingRate.currentRate,
      deviation2d: analysis.priceVsVwap2d.deviation,
    });
  }
  
  // Update cache
  cachedData = rows;
  lastCacheTime = now;
  
  return rows;
}

export async function GET() {
  try {
    const data = await loadScannerData();
    return NextResponse.json({
      data,
      timestamp: new Date().toISOString(),
      count: data.length,
    });
  } catch (error) {
    console.error("Failed to load scanner data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load data" },
      { status: 500 }
    );
  }
}

// Force dynamic rendering (no static generation)
export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds
