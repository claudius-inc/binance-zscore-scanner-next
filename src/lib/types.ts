/**
 * Shared types for the Z-Score Scanner.
 */

export interface SymbolRow {
  symbol: string;
  sector: string;
  currentPrice: number | null;
  volume24h: number;
  openInterest: number;
  priceChange24h: number;
  zscore2d: number | null;
  zscore5d: number | null;
  zscore1w: number | null;
  zscoreFunding: number | null;
  zscoreCurrentWeek: number | null;
  zscorePriorWeek: number | null;
  vwap2d: number | null;
  vwap5d: number | null;
  fundingRate: number | null;
  deviation2d: number | null;
}

export type ViewType = 
  | "2D vs 5D VWAP" 
  | "2D VWAP vs Prior Week" 
  | "2D VWAP vs Current Week" 
  | "VWAP vs Funding Rate";

export interface ViewConfig {
  xField: keyof SymbolRow;
  yField: keyof SymbolRow;
  xLabel: string;
  yLabel: string;
  description: string;
}

export const VIEW_OPTIONS: Record<ViewType, ViewConfig> = {
  "2D vs 5D VWAP": {
    xField: "zscore2d",
    yField: "zscore5d",
    xLabel: "Z-Score vs 2D VWAP",
    yLabel: "Z-Score vs 5D VWAP",
    description: "Quick market context — how unusual is price vs short and medium VWAP",
  },
  "2D VWAP vs Prior Week": {
    xField: "zscore2d",
    yField: "zscorePriorWeek",
    xLabel: "Z-Score vs 2D VWAP",
    yLabel: "Z-Score vs Prior Week VWAP",
    description: "Is the price extension genuine on two independent windows?",
  },
  "2D VWAP vs Current Week": {
    xField: "zscore2d",
    yField: "zscoreCurrentWeek",
    xLabel: "Z-Score vs 2D VWAP",
    yLabel: "Z-Score vs Current Week VWAP",
    description: "What does the week look like? (best Thu/Fri)",
  },
  "VWAP vs Funding Rate": {
    xField: "zscore2d",
    yField: "zscoreFunding",
    xLabel: "Z-Score vs 2D VWAP",
    yLabel: "Z-Score Funding Rate",
    description: "Identify leverage risk / overcrowded positioning",
  },
};

export type SizeByOption = "24H Volume" | "Open Interest" | "Equal";

export interface FilterState {
  view: ViewType;
  sigmaThreshold: number;
  selectedSectors: string[];
  sizeBy: SizeByOption;
  searchQuery: string;
}
