"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZScoreScatterPlot } from "@/components/scatter-plot";
import { Filters } from "@/components/filters";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { SymbolRow, FilterState } from "@/lib/types";
import { VIEW_OPTIONS } from "@/lib/types";
import { getAllSectors } from "@/lib/sectors";

const initialFilters: FilterState = {
  view: "2D vs 5D VWAP",
  sigmaThreshold: 0,
  selectedSectors: getAllSectors(),
  sizeBy: "24H Volume",
  searchQuery: "",
};

export default function Home() {
  const [data, setData] = useState<SymbolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json.data);
      setLastUpdate(new Date(json.timestamp).toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const viewConfig = VIEW_OPTIONS[filters.view];

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Sector filter
      if (!filters.selectedSectors.includes(row.sector)) return false;

      // Search filter
      if (
        filters.searchQuery &&
        !row.symbol.includes(filters.searchQuery.toUpperCase())
      )
        return false;

      // Sigma threshold filter
      const xValue = row[viewConfig.xField] as number | null;
      const yValue = row[viewConfig.yField] as number | null;

      if (filters.sigmaThreshold > 0) {
        const xExceeds =
          xValue !== null && Math.abs(xValue) >= filters.sigmaThreshold;
        const yExceeds =
          yValue !== null && Math.abs(yValue) >= filters.sigmaThreshold;
        if (!xExceeds && !yExceeds) return false;
      }

      return true;
    });
  }, [data, filters, viewConfig]);

  // Stats calculations
  const extremeCount = useMemo(() => {
    return filteredData.filter((row) => {
      const xValue = row[viewConfig.xField] as number | null;
      const yValue = row[viewConfig.yField] as number | null;
      return (
        (xValue !== null && Math.abs(xValue) >= 2) ||
        (yValue !== null && Math.abs(yValue) >= 2)
      );
    }).length;
  }, [filteredData, viewConfig]);

  const mostExtreme = useMemo(() => {
    return filteredData.reduce<SymbolRow | null>((max, row) => {
      const xValue = row[viewConfig.xField] as number | null;
      const yValue = row[viewConfig.yField] as number | null;
      const maxZscore = Math.max(Math.abs(xValue ?? 0), Math.abs(yValue ?? 0));

      if (!max) return row;

      const maxXValue = max[viewConfig.xField] as number | null;
      const maxYValue = max[viewConfig.yField] as number | null;
      const maxMaxZscore = Math.max(
        Math.abs(maxXValue ?? 0),
        Math.abs(maxYValue ?? 0)
      );

      return maxZscore > maxMaxZscore ? row : max;
    }, null);
  }, [filteredData, viewConfig]);

  // Get size field for scatter plot
  const sizeFieldMap: Record<
    FilterState["sizeBy"],
    "volume24h" | "openInterest" | null
  > = {
    "24H Volume": "volume24h",
    "Open Interest": "openInterest",
    Equal: null,
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Symbol",
      "Sector",
      "Price",
      "Z(2D)",
      "Z(5D)",
      "Z(FR)",
      "24H%",
      "Volume",
      "OI",
    ];
    const rows = filteredData.map((row) => [
      row.symbol,
      row.sector,
      row.currentPrice,
      row.zscore2d,
      row.zscore5d,
      row.zscoreFunding,
      row.priceChange24h,
      row.volume24h,
      row.openInterest,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zscore_scan_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            📊 Binance Perp Z-Score Scanner
          </h1>
          <p className="text-muted-foreground">
            Scan all Binance perpetual futures for statistical anomalies
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-80 shrink-0">
            <Filters
              filters={filters}
              onChange={setFilters}
              onRefresh={fetchData}
              loading={loading}
            />
            {lastUpdate && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Last update: {lastUpdate}
              </p>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-red-600">Error: {error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Symbols
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Filtered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{filteredData.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Beyond ±2σ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {extremeCount}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Most Extreme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {mostExtreme?.symbol.replace("USDT", "") || "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Scatter Plot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 {filters.view}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && data.length === 0 ? (
                  <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                    Loading market data... (this may take a minute on first
                    load)
                  </div>
                ) : (
                  <ZScoreScatterPlot
                    data={filteredData}
                    viewConfig={viewConfig}
                    sizeField={sizeFieldMap[filters.sizeBy]}
                  />
                )}
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>📋 Data Table</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable data={filteredData} viewConfig={viewConfig} />
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-xs text-muted-foreground text-center pb-4">
              Z-Score interpretation: ±1σ = normal, ±2σ = unusual (5%
              probability), ±3σ = rare (0.3% probability). Red grid lines
              indicate ±2σ boundaries. Data refreshes every 60 seconds.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
