"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SymbolRow, ViewConfig } from "@/lib/types";
import { getSectorColor } from "@/lib/sectors";

interface DataTableProps {
  data: SymbolRow[];
  viewConfig: ViewConfig;
}

type SortField = keyof SymbolRow | "_maxZscore";
type SortDirection = "asc" | "desc";

const formatNumber = (value: number | null, decimals: number = 2): string => {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
};

const formatCurrency = (value: number | null, decimals: number = 4): string => {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(decimals)}`;
};

const formatVolume = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export function DataTable({ data, viewConfig }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>("_maxZscore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = useMemo(() => {
    const sorted = [...data].map((row) => ({
      ...row,
      _maxZscore: Math.max(
        Math.abs(row[viewConfig.xField] as number ?? 0),
        Math.abs(row[viewConfig.yField] as number ?? 0)
      ),
    }));

    sorted.sort((a, b) => {
      let aVal: number | string | null;
      let bVal: number | string | null;

      if (sortField === "_maxZscore") {
        aVal = a._maxZscore;
        bVal = b._maxZscore;
      } else {
        aVal = a[sortField as keyof SymbolRow] as number | string | null;
        bVal = b[sortField as keyof SymbolRow] as number | string | null;
      }

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [data, sortField, sortDirection, viewConfig]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="ml-1 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[100px]">
                <SortButton field="symbol">Symbol</SortButton>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortButton field="sector">Sector</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="currentPrice">Price</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field={viewConfig.xField as keyof SymbolRow}>
                  {viewConfig.xLabel.replace("Z-Score ", "Z ")}
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field={viewConfig.yField as keyof SymbolRow}>
                  {viewConfig.yLabel.replace("Z-Score ", "Z ")}
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="priceChange24h">24H %</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="volume24h">Volume 24H</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="openInterest">OI</SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const xValue = row[viewConfig.xField] as number | null;
              const yValue = row[viewConfig.yField] as number | null;
              const isExtreme =
                (xValue !== null && Math.abs(xValue) >= 2) ||
                (yValue !== null && Math.abs(yValue) >= 2);

              return (
                <TableRow
                  key={row.symbol}
                  className={isExtreme ? "bg-red-50 dark:bg-red-950/20" : ""}
                >
                  <TableCell className="font-medium">
                    {row.symbol.replace("USDT", "")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: getSectorColor(row.sector),
                        color: getSectorColor(row.sector),
                      }}
                    >
                      {row.sector}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(row.currentPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        xValue !== null
                          ? Math.abs(xValue) >= 2
                            ? "text-red-600 font-bold"
                            : xValue > 0
                              ? "text-green-600"
                              : xValue < 0
                                ? "text-red-600"
                                : ""
                          : ""
                      }
                    >
                      {formatNumber(xValue)}σ
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        yValue !== null
                          ? Math.abs(yValue) >= 2
                            ? "text-red-600 font-bold"
                            : yValue > 0
                              ? "text-green-600"
                              : yValue < 0
                                ? "text-red-600"
                                : ""
                          : ""
                      }
                    >
                      {viewConfig.yField.includes("Week")
                        ? `${formatNumber(yValue)}%`
                        : `${formatNumber(yValue)}σ`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        row.priceChange24h > 0
                          ? "text-green-600"
                          : row.priceChange24h < 0
                            ? "text-red-600"
                            : ""
                      }
                    >
                      {row.priceChange24h > 0 ? "+" : ""}
                      {formatNumber(row.priceChange24h)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatVolume(row.volume24h)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatVolume(row.openInterest)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
