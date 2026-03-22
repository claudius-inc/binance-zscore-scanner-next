"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAllSectors, getSectorColor } from "@/lib/sectors";
import { VIEW_OPTIONS, type FilterState, type ViewType, type SizeByOption } from "@/lib/types";

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const sizeOptions: SizeByOption[] = ["24H Volume", "Open Interest", "Equal"];

export function Filters({ filters, onChange, onRefresh, loading }: FiltersProps) {
  const allSectors = getAllSectors();

  const handleViewChange = (view: string | null) => {
    if (view) {
      onChange({ ...filters, view: view as ViewType });
    }
  };

  const handleSigmaChange = (value: number | readonly number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    onChange({ ...filters, sigmaThreshold: v });
  };

  const handleSectorToggle = (sector: string) => {
    const newSectors = filters.selectedSectors.includes(sector)
      ? filters.selectedSectors.filter((s) => s !== sector)
      : [...filters.selectedSectors, sector];
    onChange({ ...filters, selectedSectors: newSectors });
  };

  const handleSelectAll = () => {
    onChange({ ...filters, selectedSectors: allSectors });
  };

  const handleClearAll = () => {
    onChange({ ...filters, selectedSectors: [] });
  };

  const handleSizeByChange = (value: string | null) => {
    if (value) {
      onChange({ ...filters, sizeBy: value as SizeByOption });
    }
  };

  const handleSearchChange = (value: string) => {
    onChange({ ...filters, searchQuery: value.toUpperCase() });
  };

  const viewConfig = VIEW_OPTIONS[filters.view];

  return (
    <div className="space-y-4">
      {/* View Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📊 View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filters.view} onValueChange={handleViewChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VIEW_OPTIONS) as ViewType[]).map((view) => (
                <SelectItem key={view} value={view}>
                  {view}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2 italic">
            {viewConfig.description}
          </p>
        </CardContent>
      </Card>

      {/* Sigma Threshold */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📏 σ Threshold
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              value={[filters.sigmaThreshold]}
              onValueChange={handleSigmaChange}
              min={0}
              max={4}
              step={0.5}
              className="flex-1"
            />
            <Badge variant="secondary" className="min-w-[60px] justify-center">
              ≥ {filters.sigmaThreshold}σ
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Show only outliers beyond this threshold
          </p>
        </CardContent>
      </Card>

      {/* Sectors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            🏷️ Sectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1"
            >
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allSectors.map((sector) => (
              <div key={sector} className="flex items-center space-x-2">
                <Checkbox
                  id={sector}
                  checked={filters.selectedSectors.includes(sector)}
                  onCheckedChange={() => handleSectorToggle(sector)}
                />
                <label
                  htmlFor={sector}
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSectorColor(sector) }}
                  />
                  {sector}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dot Size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            ⚫ Dot Size
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={filters.sizeBy}
            onValueChange={handleSizeByChange}
            className="space-y-2"
          >
            {sizeOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={option} />
                <label htmlFor={option} className="text-sm cursor-pointer">
                  {option}
                </label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            🔍 Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., BTC, ETH, SOL"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <Button
        onClick={onRefresh}
        disabled={loading}
        className="w-full"
        variant="outline"
      >
        {loading ? "🔄 Loading..." : "🔄 Refresh Data"}
      </Button>
    </div>
  );
}
