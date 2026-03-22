import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = ['sin1', 'hkg1', 'syd1'];

interface BinanceSymbol {
  symbol: string;
  contractType: string;
  status: string;
}

interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open
  2: string;  // High
  3: string;  // Low
  4: string;  // Close
  5: string;  // Volume
}

interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

interface BinanceTicker {
  symbol: string;
  volume: string;
  quoteVolume: string;
}

const SECTORS: Record<string, string[]> = {
  L1: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'ADAUSDT', 'DOTUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT', 'SUIUSDT'],
  L2: ['MATICUSDT', 'ARBUSDT', 'OPUSDT', 'STXUSDT', 'IMXUSDT', 'MANTAUSDT', 'METISUSDT', 'ZKUSDT'],
  DeFi: ['UNIUSDT', 'AAVEUSDT', 'MKRUSDT', 'CRVUSDT', 'COMPUSDT', 'SNXUSDT', 'LDOUSDT', 'PENDLEUSDT', 'JUPUSDT'],
  Meme: ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT', 'WIFUSDT', 'MEMEUSDT'],
  AI: ['FETUSDT', 'AGIXUSDT', 'OCEANUSDT', 'RENDERUSDT', 'TAOUSDT', 'ARKMUSDT', 'WLDUSDT'],
  Gaming: ['AXSUSDT', 'SANDUSDT', 'MANAUSDT', 'GALAUSDT', 'ENJUSDT', 'IMXUSDT', 'YGGUSDT', 'PIXELUSDT'],
  Infrastructure: ['LINKUSDT', 'GRTUSDT', 'FILUSDT', 'ARUSDT', 'STORJUSDT', 'RNDRWEBUSDT'],
  Exchange: ['BNBUSDT', 'FTMUSDT', 'CAKEUSDT'],
  'Stablecoin/Yield': ['ETHFIUSDT', 'ENAUSDT'],
};

function getSector(symbol: string): string {
  for (const [sector, symbols] of Object.entries(SECTORS)) {
    if (symbols.includes(symbol)) return sector;
  }
  return 'Other';
}

function calculateVWAP(klines: BinanceKline[]): number {
  let sumPriceVolume = 0;
  let sumVolume = 0;
  
  for (const k of klines) {
    const typicalPrice = (parseFloat(k[2]) + parseFloat(k[3]) + parseFloat(k[4])) / 3;
    const volume = parseFloat(k[5]);
    sumPriceVolume += typicalPrice * volume;
    sumVolume += volume;
  }
  
  return sumVolume > 0 ? sumPriceVolume / sumVolume : 0;
}

function calculateZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

export async function GET() {
  try {
    // Fetch exchange info
    const exchangeRes = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!exchangeRes.ok) {
      return NextResponse.json({ error: `Failed to fetch exchange info: ${exchangeRes.status}` }, { status: 500 });
    }
    
    const exchangeInfo = await exchangeRes.json();
    const symbols = exchangeInfo.symbols
      .filter((s: BinanceSymbol) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
      .map((s: BinanceSymbol) => s.symbol)
      .slice(0, 50); // Limit for performance
    
    // Fetch 24h tickers for volume
    const tickerRes = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    const tickers: BinanceTicker[] = await tickerRes.json();
    const tickerMap = new Map(tickers.map(t => [t.symbol, t]));
    
    // Fetch funding rates
    const fundingRes = await fetch('https://fapi.binance.com/fapi/v1/fundingRate?limit=100');
    const fundingRates: BinanceFundingRate[] = await fundingRes.json();
    const fundingMap = new Map(fundingRates.map(f => [f.symbol, parseFloat(f.fundingRate)]));
    
    // Process top symbols with klines
    const results = [];
    
    for (const symbol of symbols.slice(0, 30)) {
      try {
        // Fetch 5 days of hourly klines
        const klineRes = await fetch(
          `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=120`
        );
        const klines: BinanceKline[] = await klineRes.json();
        
        if (!Array.isArray(klines) || klines.length < 48) continue;
        
        const currentPrice = parseFloat(klines[klines.length - 1][4]);
        
        // Calculate VWAPs
        const vwap2d = calculateVWAP(klines.slice(-48));
        const vwap5d = calculateVWAP(klines);
        
        // Calculate z-scores (simplified - using price deviation as proxy)
        const prices = klines.map(k => parseFloat(k[4]));
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const std = Math.sqrt(prices.map(p => (p - mean) ** 2).reduce((a, b) => a + b, 0) / prices.length);
        
        const zScore2d = calculateZScore(currentPrice, vwap2d, std);
        const zScore5d = calculateZScore(currentPrice, vwap5d, std);
        
        const ticker = tickerMap.get(symbol);
        const fundingRate = fundingMap.get(symbol) || 0;
        
        results.push({
          symbol,
          sector: getSector(symbol),
          price: currentPrice,
          zScore2d: Math.round(zScore2d * 100) / 100,
          zScore5d: Math.round(zScore5d * 100) / 100,
          zScoreFunding: Math.round((fundingRate * 10000) * 100) / 100,
          volume24h: ticker ? parseFloat(ticker.quoteVolume) : 0,
          fundingRate: Math.round(fundingRate * 10000) / 100,
        });
      } catch (e) {
        console.error(`Error processing ${symbol}:`, e);
      }
    }
    
    return NextResponse.json({ data: results, timestamp: Date.now() });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
