"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Filter,
  X,
  Search,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Jurisdiction } from "@/types";

export interface AdvancedFilterConfig {
  // Text search
  searchText?: string;
  searchFields?: string[]; // Fields to search in (e.g., ['ticker', 'issuer', 'isin'])
  
  // Jurisdiction filters
  jurisdictions?: Jurisdiction[];
  
  // Risk status
  riskStatus?: ("breach" | "warning" | "safe")[];
  
  // Numeric ranges
  ownershipPercentMin?: number;
  ownershipPercentMax?: number;
  buyingVelocityMin?: number;
  buyingVelocityMax?: number;
  priceMin?: number;
  priceMax?: number;
  
  // Date ranges
  lastUpdatedFrom?: string;
  lastUpdatedTo?: string;
  
  // Data freshness
  dataFreshness?: ("fresh" | "stale" | "error")[];
  
  // Velocity categories
  velocityCategory?: ("high" | "medium" | "low")[];
}

export interface FilterPreset {
  id: string;
  name: string;
  config: AdvancedFilterConfig;
}

interface AdvancedFilterProps {
  config: AdvancedFilterConfig;
  onConfigChange: (config: AdvancedFilterConfig) => void;
  availableFields?: string[];
  presets?: FilterPreset[];
  onSavePreset?: (name: string, config: AdvancedFilterConfig) => void;
  onDeletePreset?: (presetId: string) => void;
  className?: string;
}

export default function AdvancedFilter({
  config,
  onConfigChange,
  availableFields = ["ticker", "issuer", "isin"],
  presets = [],
  onSavePreset,
  onDeletePreset,
  className,
}: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (config.searchText?.trim()) count++;
    if (config.jurisdictions && config.jurisdictions.length > 0) count++;
    if (config.riskStatus && config.riskStatus.length > 0) count++;
    if (config.ownershipPercentMin !== undefined || config.ownershipPercentMax !== undefined) count++;
    if (config.buyingVelocityMin !== undefined || config.buyingVelocityMax !== undefined) count++;
    if (config.priceMin !== undefined || config.priceMax !== undefined) count++;
    if (config.lastUpdatedFrom || config.lastUpdatedTo) count++;
    if (config.dataFreshness && config.dataFreshness.length > 0) count++;
    if (config.velocityCategory && config.velocityCategory.length > 0) count++;
    return count;
  }, [config]);

  const updateConfig = (updates: Partial<AdvancedFilterConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const clearFilters = () => {
    onConfigChange({});
  };

  const applyPreset = (preset: FilterPreset) => {
    onConfigChange(preset.config);
    setSelectedPreset(preset.id);
  };

  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), config);
      setPresetName("");
      setIsPresetDialogOpen(false);
    }
  };

  const allJurisdictions: Jurisdiction[] = ["USA", "UK", "Hong Kong", "APAC", "Other"];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <Select
              value={selectedPreset || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setSelectedPreset(null);
                } else {
                  const preset = presets.find((p) => p.id === value);
                  if (preset) applyPreset(preset);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Presets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Preset</SelectItem>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {onSavePreset && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPresetDialogOpen(true)}
              className="h-8 text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              Save Preset
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <Card className="p-4 border border-border bg-muted/30">
          <div className="space-y-4">
            {/* Text Search */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Search</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by ticker, issuer, or ISIN..."
                    value={config.searchText || ""}
                    onChange={(e) => updateConfig({ searchText: e.target.value })}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={config.searchFields?.join(",") || availableFields.join(",")}
                  onValueChange={(value) =>
                    updateConfig({ searchFields: value.split(",") })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={availableFields.join(",")}>All Fields</SelectItem>
                    {availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field.charAt(0).toUpperCase() + field.slice(1)} Only
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Jurisdiction Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Jurisdictions</Label>
                <div className="flex flex-wrap gap-2">
                  {allJurisdictions.map((jur) => {
                    const isSelected = config.jurisdictions?.includes(jur);
                    return (
                      <button
                        key={jur}
                        type="button"
                        onClick={() => {
                          const current = config.jurisdictions || [];
                          const updated = isSelected
                            ? current.filter((j) => j !== jur)
                            : [...current, jur];
                          updateConfig({ jurisdictions: updated.length > 0 ? updated : undefined });
                        }}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {jur}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Risk Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Risk Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(["breach", "warning", "safe"] as const).map((status) => {
                    const isSelected = config.riskStatus?.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          const current = config.riskStatus || [];
                          const updated = isSelected
                            ? current.filter((s) => s !== status)
                            : [...current, status];
                          updateConfig({ riskStatus: updated.length > 0 ? updated : undefined });
                        }}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors capitalize ${
                          isSelected
                            ? status === "breach"
                              ? "bg-red-500/20 text-red-500 border-red-500/40"
                              : status === "warning"
                              ? "bg-orange-500/20 text-orange-500 border-orange-500/40"
                              : "bg-green-500/20 text-green-500 border-green-500/40"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Velocity Category Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Buying Velocity</Label>
                <div className="flex flex-wrap gap-2">
                  {(["high", "medium", "low"] as const).map((cat) => {
                    const isSelected = config.velocityCategory?.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const current = config.velocityCategory || [];
                          const updated = isSelected
                            ? current.filter((c) => c !== cat)
                            : [...current, cat];
                          updateConfig({ velocityCategory: updated.length > 0 ? updated : undefined });
                        }}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors capitalize ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ownership % Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Ownership %</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={config.ownershipPercentMin ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        ownershipPercentMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={config.ownershipPercentMax ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        ownershipPercentMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Buying Velocity Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Buying Velocity (shares/hr)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={config.buyingVelocityMin ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        buyingVelocityMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                    step="100"
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={config.buyingVelocityMax ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        buyingVelocityMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                    step="100"
                    min="0"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Price Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={config.priceMin ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        priceMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                    step="0.01"
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={config.priceMax ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        priceMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Last Updated</Label>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={config.lastUpdatedFrom || ""}
                    onChange={(e) =>
                      updateConfig({ lastUpdatedFrom: e.target.value || undefined })
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="datetime-local"
                    value={config.lastUpdatedTo || ""}
                    onChange={(e) =>
                      updateConfig({ lastUpdatedTo: e.target.value || undefined })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Data Freshness */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Data Freshness</Label>
                <div className="flex flex-wrap gap-2">
                  {(["fresh", "stale", "error"] as const).map((freshness) => {
                    const isSelected = config.dataFreshness?.includes(freshness);
                    return (
                      <button
                        key={freshness}
                        type="button"
                        onClick={() => {
                          const current = config.dataFreshness || [];
                          const updated = isSelected
                            ? current.filter((f) => f !== freshness)
                            : [...current, freshness];
                          updateConfig({ dataFreshness: updated.length > 0 ? updated : undefined });
                        }}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors capitalize ${
                          isSelected
                            ? freshness === "fresh"
                              ? "bg-green-500/20 text-green-500 border-green-500/40"
                              : freshness === "stale"
                              ? "bg-orange-500/20 text-orange-500 border-orange-500/40"
                              : "bg-red-500/20 text-red-500 border-red-500/40"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {freshness}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filter configuration for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Preset Name</Label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., High Risk Positions"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && presetName.trim()) {
                    handleSavePreset();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


