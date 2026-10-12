"use client";

import { useState } from "react";

import {
  FacetOptionText,
  facetRowClassName,
} from "@/components/filters/filter-section";
import type { FacetOption } from "@/components/filters/filter-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { FacetField } from "@/lib/query";
import { cn } from "@/lib/utils";

const COLLAPSED_COUNT = 8;

/** Multi-select checkbox list for a short facet (set-aside, buying office). */
export function FacetChecklist({
  field,
  options,
  selected,
  loading,
  onToggle,
}: {
  field: FacetField;
  options: FacetOption[];
  selected: string[];
  loading: boolean;
  onToggle: (value: string, checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <FacetSkeleton />;
  if (options.length === 0)
    return (
      <p className="text-xs text-muted-foreground">No values in results</p>
    );

  // Selected values always stay visible, even past the collapsed cutoff.
  const visible = expanded
    ? options
    : options.filter(
        (option, index) =>
          index < COLLAPSED_COUNT || selected.includes(option.value),
      );
  const hidden = options.length - visible.length;

  return (
    <div>
      {visible.map((option) => (
        <label
          key={option.value}
          className={cn(
            facetRowClassName(option.count),
            "cursor-pointer hover:bg-muted",
          )}
        >
          <Checkbox
            checked={selected.includes(option.value)}
            onCheckedChange={(checked) =>
              onToggle(option.value, checked === true)
            }
          />
          <FacetOptionText field={field} option={option} />
        </label>
      ))}
      {(hidden > 0 || expanded) && options.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {expanded ? "Show fewer" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

export function FacetSkeleton() {
  return (
    <div className="space-y-2 py-0.5" aria-hidden>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-5 w-3/5" />
    </div>
  );
}
