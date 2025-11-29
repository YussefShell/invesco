import React from "react";
import type { Holding, Jurisdiction } from "@/types";
import type { AdvancedFilterConfig } from "@/components/advanced-filter";

/**
 * Apply advanced filter configuration to a list of holdings
 */
export function applyAdvancedFilter<T extends Holding>(
  holdings: T[],
  filterConfig: AdvancedFilterConfig,
  getRiskStatus?: (holding: T) => "breach" | "warning" | "safe"
): T[] {
  let filtered = [...holdings];

  // Text search
  if (filterConfig.searchText?.trim()) {
    const searchTerm = filterConfig.searchText.trim().toLowerCase();
    const searchFields = filterConfig.searchFields || ["ticker", "issuer", "isin"];
    
    filtered = filtered.filter((holding) => {
      return searchFields.some((field) => {
        const value = holding[field as keyof Holding];
        return value && String(value).toLowerCase().includes(searchTerm);
      });
    });
  }

  // Jurisdiction filter
  if (filterConfig.jurisdictions && filterConfig.jurisdictions.length > 0) {
    filtered = filtered.filter((holding) =>
      filterConfig.jurisdictions!.includes(holding.jurisdiction)
    );
  }

  // Risk status filter
  if (filterConfig.riskStatus && filterConfig.riskStatus.length > 0 && getRiskStatus) {
    filtered = filtered.filter((holding) => {
      const status = getRiskStatus(holding);
      return filterConfig.riskStatus!.includes(status);
    });
  }

  // Ownership % range
  filtered = filtered.filter((holding) => {
    const ownershipPercent = (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
    
    if (filterConfig.ownershipPercentMin !== undefined && ownershipPercent < filterConfig.ownershipPercentMin) {
      return false;
    }
    if (filterConfig.ownershipPercentMax !== undefined && ownershipPercent > filterConfig.ownershipPercentMax) {
      return false;
    }
    return true;
  });

  // Buying velocity range
  if (filterConfig.buyingVelocityMin !== undefined || filterConfig.buyingVelocityMax !== undefined) {
    filtered = filtered.filter((holding) => {
      if (filterConfig.buyingVelocityMin !== undefined && holding.buyingVelocity < filterConfig.buyingVelocityMin) {
        return false;
      }
      if (filterConfig.buyingVelocityMax !== undefined && holding.buyingVelocity > filterConfig.buyingVelocityMax) {
        return false;
      }
      return true;
    });
  }

  // Price range
  if (filterConfig.priceMin !== undefined || filterConfig.priceMax !== undefined) {
    filtered = filtered.filter((holding) => {
      if (holding.price === undefined) return false;
      if (filterConfig.priceMin !== undefined && holding.price < filterConfig.priceMin) {
        return false;
      }
      if (filterConfig.priceMax !== undefined && holding.price > filterConfig.priceMax) {
        return false;
      }
      return true;
    });
  }

  // Date range filter
  if (filterConfig.lastUpdatedFrom || filterConfig.lastUpdatedTo) {
    filtered = filtered.filter((holding) => {
      const lastUpdated = new Date(holding.lastUpdated);
      
      if (filterConfig.lastUpdatedFrom) {
        const fromDate = new Date(filterConfig.lastUpdatedFrom);
        if (lastUpdated < fromDate) return false;
      }
      
      if (filterConfig.lastUpdatedTo) {
        const toDate = new Date(filterConfig.lastUpdatedTo);
        if (lastUpdated > toDate) return false;
      }
      
      return true;
    });
  }

  // Data freshness filter
  if (filterConfig.dataFreshness && filterConfig.dataFreshness.length > 0) {
    filtered = filtered.filter((holding) => {
      const parsed = new Date(holding.lastUpdated);
      const ageMs = Date.now() - parsed.getTime();
      const oneMinute = 60 * 1000;
      const fifteenMinutes = 15 * 60 * 1000;
      const oneHour = 60 * 60 * 1000;

      let freshness: "fresh" | "stale" | "error";
      if (ageMs < fifteenMinutes) {
        freshness = "fresh";
      } else if (ageMs < oneHour) {
        freshness = "stale";
      } else {
        freshness = "error";
      }

      return filterConfig.dataFreshness!.includes(freshness);
    });
  }

  // Velocity category filter
  if (filterConfig.velocityCategory && filterConfig.velocityCategory.length > 0) {
    filtered = filtered.filter((holding) => {
      const velocity = holding.buyingVelocity;
      let category: "high" | "medium" | "low";
      
      if (velocity >= 10000) {
        category = "high";
      } else if (velocity >= 2000) {
        category = "medium";
      } else {
        category = "low";
      }
      
      return filterConfig.velocityCategory!.includes(category);
    });
  }

  return filtered;
}

/**
 * Highlight search text in a string
 */
export function highlightSearchText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text;
  
  // Escape special regex characters in search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedSearchTerm})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
}

