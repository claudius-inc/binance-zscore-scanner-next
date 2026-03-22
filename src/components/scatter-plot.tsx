"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Cell,
} from "recharts";
import type { SymbolRow, ViewConfig } from "@/lib/types";
import { getSectorColor } from "@/lib/sectors";

interface ScatterPlotProps {
  data: SymbolRow[];
  viewConfig: ViewConfig;
  sizeField: "volume24h" | "openInterest" | null;
}

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SymbolRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border text-sm">
      <div className="font-bold text-lg">{row.symbol.replace("USDT", "")}</div>
      <div className="text-muted-foreground">{row.sector}</div>
      <div className="mt-2 space-y-1">
        <div>Price: ${row.currentPrice?.toFixed(4) ?? "N/A"}</div>
        <div>Z (2D): {row.zscore2d?.toFixed(2) ?? "N/A"}σ</div>
        <div>Z (5D): {row.zscore5d?.toFixed(2) ?? "N/A"}σ</div>
        <div>24H Vol: ${((row.volume24h || 0) / 1e6).toFixed(1)}M</div>
        <div>OI: ${((row.openInterest || 0) / 1e6).toFixed(1)}M</div>
        <div>24H %: {row.priceChange24h?.toFixed(2) ?? "N/A"}%</div>
      </div>
    </div>
  );
}

export function ZScoreScatterPlot({ data, viewConfig, sizeField }: ScatterPlotProps) {
  // Group data by sector
  const sectors = [...new Set(data.map((d) => d.sector))].sort();

  // Calculate axis range
  const xValues = data
    .map((d) => d[viewConfig.xField] as number)
    .filter((v) => v != null);
  const yValues = data
    .map((d) => d[viewConfig.yField] as number)
    .filter((v) => v != null);

  const maxSigma = Math.max(
    Math.abs(Math.min(...xValues, 0)),
    Math.abs(Math.max(...xValues, 0)),
    Math.abs(Math.min(...yValues, 0)),
    Math.abs(Math.max(...yValues, 0)),
    3
  );
  const gridRange = Math.ceil(maxSigma) + 1;

  // Normalize sizes
  const sizeValues = sizeField
    ? data.map((d) => (d[sizeField] as number) || 0)
    : [];
  const maxSize = Math.max(...sizeValues, 1);
  const minSize = Math.min(...sizeValues.filter((v) => v > 0), 0);

  // Process data for the chart
  const processedData = data
    .filter((d) => d[viewConfig.xField] != null && d[viewConfig.yField] != null)
    .map((d) => {
      const sizeValue = sizeField ? ((d[sizeField] as number) || 0) : 50;
      const normalizedSize = sizeField
        ? 50 + ((sizeValue - minSize) / (maxSize - minSize || 1)) * 200
        : 100;

      return {
        ...d,
        x: d[viewConfig.xField] as number,
        y: d[viewConfig.yField] as number,
        z: normalizedSize,
        color: getSectorColor(d.sector),
      };
    });

  // Generate reference lines for sigma grid
  const sigmaLines = [];
  for (let i = -gridRange; i <= gridRange; i++) {
    if (i !== 0) {
      sigmaLines.push(i);
    }
  }

  return (
    <ResponsiveContainer width="100%" height={600}>
      <ScatterChart margin={{ top: 20, right: 80, bottom: 60, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

        {/* Sigma reference lines */}
        {sigmaLines.map((sigma) => (
          <ReferenceLine
            key={`x-${sigma}`}
            x={sigma}
            stroke={Math.abs(sigma) >= 2 ? "rgba(255,0,0,0.3)" : "rgba(128,128,128,0.2)"}
            strokeWidth={Math.abs(sigma) >= 2 ? 2 : 1}
            strokeDasharray="4 4"
          />
        ))}
        {sigmaLines.map((sigma) => (
          <ReferenceLine
            key={`y-${sigma}`}
            y={sigma}
            stroke={Math.abs(sigma) >= 2 ? "rgba(255,0,0,0.3)" : "rgba(128,128,128,0.2)"}
            strokeWidth={Math.abs(sigma) >= 2 ? 2 : 1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Center lines */}
        <ReferenceLine x={0} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
        <ReferenceLine y={0} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />

        <XAxis
          type="number"
          dataKey="x"
          name={viewConfig.xLabel}
          domain={[-gridRange, gridRange]}
          tickCount={gridRange * 2 + 1}
          label={{
            value: viewConfig.xLabel,
            position: "bottom",
            offset: 40,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={viewConfig.yLabel}
          domain={[-gridRange, gridRange]}
          tickCount={gridRange * 2 + 1}
          label={{
            value: viewConfig.yLabel,
            angle: -90,
            position: "left",
            offset: 40,
          }}
        />
        <ZAxis type="number" dataKey="z" range={[50, 300]} />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          verticalAlign="top"
          align="right"
          layout="vertical"
          wrapperStyle={{ paddingLeft: 20 }}
        />

        {/* Render each sector as a separate scatter */}
        {sectors.map((sector) => {
          const sectorData = processedData.filter((d) => d.sector === sector);
          const color = getSectorColor(sector);

          return (
            <Scatter
              key={sector}
              name={sector}
              data={sectorData}
              fill={color}
              fillOpacity={0.7}
            >
              {sectorData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          );
        })}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
