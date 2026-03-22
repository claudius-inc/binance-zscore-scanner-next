/**
 * Binance Futures API client for server-side use.
 */

const BINANCE_FUTURES_BASE = "https://fapi.binance.com";

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 50; // 50ms between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  return fetch(url, { next: { revalidate: 60 } }); // Cache for 60s
}

export interface ExchangeInfo {
  symbols: {
    symbol: string;
    contractType: string;
    status: string;
    quoteAsset: string;
  }[];
}

export interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

export interface FundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export interface OpenInterest {
  symbol: string;
  openInterest: string;
}

/**
 * Get exchange info with all perpetual symbols.
 */
export async function getExchangeInfo(): Promise<ExchangeInfo> {
  const res = await rateLimitedFetch(`${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`);
  if (!res.ok) throw new Error(`Failed to fetch exchange info: ${res.status}`);
  return res.json();
}

/**
 * Get list of all active USDT perpetual symbols.
 */
export async function getAllPerpSymbols(): Promise<string[]> {
  const info = await getExchangeInfo();
  return info.symbols
    .filter(
      (s) =>
        s.contractType === "PERPETUAL" &&
        s.status === "TRADING" &&
        s.quoteAsset === "USDT"
    )
    .map((s) => s.symbol)
    .sort();
}

/**
 * Fetch kline/candlestick data.
 */
export async function getKlines(
  symbol: string,
  interval: string = "1h",
  limit: number = 500,
  startTime?: number,
  endTime?: number
): Promise<(string | number)[][]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(limit),
  });
  
  if (startTime) params.set("startTime", String(startTime));
  if (endTime) params.set("endTime", String(endTime));
  
  const res = await rateLimitedFetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/klines?${params}`
  );
  if (!res.ok) throw new Error(`Failed to fetch klines: ${res.status}`);
  return res.json();
}

/**
 * Fetch funding rate history.
 */
export async function getFundingRate(
  symbol: string,
  limit: number = 100
): Promise<FundingRate[]> {
  const params = new URLSearchParams({
    symbol,
    limit: String(limit),
  });
  
  const res = await rateLimitedFetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?${params}`
  );
  if (!res.ok) throw new Error(`Failed to fetch funding rate: ${res.status}`);
  return res.json();
}

/**
 * Fetch current open interest.
 */
export async function getOpenInterest(symbol: string): Promise<OpenInterest> {
  const res = await rateLimitedFetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`
  );
  if (!res.ok) throw new Error(`Failed to fetch open interest: ${res.status}`);
  return res.json();
}

/**
 * Fetch 24h ticker statistics.
 */
export async function getTicker24h(symbol?: string): Promise<Ticker24h | Ticker24h[]> {
  const url = symbol
    ? `${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`
    : `${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr`;
  
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch 24h ticker: ${res.status}`);
  return res.json();
}

/**
 * Get 24h ticker data for all symbols as a map.
 */
export async function getAllTickers24h(): Promise<Map<string, Ticker24h>> {
  const tickers = (await getTicker24h()) as Ticker24h[];
  return new Map(tickers.map((t) => [t.symbol, t]));
}

export interface SymbolData {
  symbol: string;
  klines: (string | number)[][];
  fundingRates: FundingRate[];
  openInterest: OpenInterest | null;
  ticker24h: Ticker24h | null;
  error?: string;
}

/**
 * Fetch all data needed for a symbol's analysis.
 */
export async function fetchSymbolData(
  symbol: string,
  klineHours: number = 720 // 30 days
): Promise<SymbolData> {
  const now = Date.now();
  const endTime = now;
  const startTime = now - klineHours * 60 * 60 * 1000;
  
  try {
    const [klines, fundingRates, openInterest, ticker24h] = await Promise.all([
      getKlines(symbol, "1h", Math.min(klineHours, 1500), startTime, endTime).catch(() => []),
      getFundingRate(symbol, 100).catch(() => []),
      getOpenInterest(symbol).catch(() => null),
      (getTicker24h(symbol) as Promise<Ticker24h>).catch(() => null),
    ]);
    
    return {
      symbol,
      klines,
      fundingRates,
      openInterest,
      ticker24h,
    };
  } catch (error) {
    return {
      symbol,
      klines: [],
      fundingRates: [],
      openInterest: null,
      ticker24h: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch data for all symbols with batching.
 */
export async function fetchAllSymbolsData(
  symbols?: string[],
  klineHours: number = 720,
  batchSize: number = 10
): Promise<Map<string, SymbolData>> {
  const symbolList = symbols ?? (await getAllPerpSymbols());
  const results = new Map<string, SymbolData>();
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < symbolList.length; i += batchSize) {
    const batch = symbolList.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((s) => fetchSymbolData(s, klineHours))
    );
    
    for (const result of batchResults) {
      results.set(result.symbol, result);
    }
  }
  
  return results;
}
