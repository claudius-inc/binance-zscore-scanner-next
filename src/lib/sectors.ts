/**
 * Sector mappings for Binance perpetual futures.
 */

export const SECTORS: Record<string, string[]> = {
  L1: [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOTUSDT",
    "ATOMUSDT", "NEARUSDT", "APTUSDT", "SUIUSDT", "SEIUSDT",
    "INJUSDT", "TIAUSDT", "TONUSDT", "ADAUSDT", "TRXUSDT",
    "XRPUSDT", "BNBUSDT", "MATICUSDT", "FTMUSDT", "ALGOUSDT",
  ],
  L2: [
    "ARBUSDT", "OPUSDT", "STRKUSDT", "MANTAUSDT", "ZKUSDT",
    "SCROLLUSDT", "METISUSDT", "IMXUSDT", "LOKAUSDT",
  ],
  DeFi: [
    "UNIUSDT", "AAVEUSDT", "MKRUSDT", "LINKUSDT", "SNXUSDT",
    "COMPUSDT", "CRVUSDT", "LDOUSDT", "PENDLEUSDT", "GMXUSDT",
    "DYDXUSDT", "1INCHUSDT", "SUSHIUSDT", "YFIUSDT", "RUNEUSDT",
    "JUPUSDT", "RAYDIUMUSDT", "JTOUSDT",
  ],
  Meme: [
    "DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "FLOKIUSDT", "BONKUSDT",
    "WIFUSDT", "BOMEUSDT", "MEMEUSDT", "PEOPLEUSDT", "NEIROUSDT",
    "ACTUSDT", "PNUTUSDT", "GOATUSDT", "TURBO", "MOGUSDT",
  ],
  AI: [
    "FETUSDT", "RENDERUSDT", "TAOUSDT", "WLDUSDT", "ARKMUSDT",
    "AITUSDT", "AIUSDT", "VIRTUALUSDT", "AI16ZUSDT",
  ],
  Gaming: [
    "AXSUSDT", "SANDUSDT", "MANAUSDT", "GALAUSDT", "ENJUSDT",
    "ILVUSDT", "YGGUSDT", "BEAMUSDT", "PIXELUSDT", "PORTALUSDT",
    "NOTUSDT", "XAIUSDT", "RONUSDT",
  ],
  Infrastructure: [
    "FILUSDT", "ARUSDT", "STORJUSDT", "GRTUSDT", "OCEANUSDT",
    "RNDR", "AKASHUSDT", "IOTAUSDT", "HBARUSDT", "QNTUSDT",
  ],
  Exchange: [
    "BNBUSDT", "OKBUSDT", "CAKEUSDT", "FTTUSDT", "SRMUSDT",
  ],
  "Stablecoin/Yield": [
    "ENAUSDT", "USTCUSDT",
  ],
};

// Build reverse mapping: symbol -> sector
const SYMBOL_TO_SECTOR: Record<string, string> = {};
for (const [sector, symbols] of Object.entries(SECTORS)) {
  for (const symbol of symbols) {
    SYMBOL_TO_SECTOR[symbol] = sector;
  }
}

export const DEFAULT_SECTOR = "Other";

export const SECTOR_COLORS: Record<string, string> = {
  L1: "#FF6B6B",              // Red
  L2: "#4ECDC4",              // Teal
  DeFi: "#45B7D1",            // Blue
  Meme: "#96CEB4",            // Green
  AI: "#FFEAA7",              // Yellow
  Gaming: "#DDA0DD",          // Plum
  Infrastructure: "#98D8C8",  // Mint
  Exchange: "#F7DC6F",        // Gold
  "Stablecoin/Yield": "#AED6F1", // Light Blue
  Other: "#BDC3C7",           // Gray
};

export function getSector(symbol: string): string {
  return SYMBOL_TO_SECTOR[symbol] || DEFAULT_SECTOR;
}

export function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector] || SECTOR_COLORS[DEFAULT_SECTOR];
}

export function getAllSectors(): string[] {
  return [...Object.keys(SECTORS), DEFAULT_SECTOR];
}
