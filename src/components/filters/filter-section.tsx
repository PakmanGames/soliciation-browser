"use client";

import type { ReactNode } from "react";

import { facetLabel } from "@/components/filters/facet-labels";
import type { FacetOption } from "@/components/filters/filter-state";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FacetField } from "@/lib/query";
import { cn } from "@/lib/utils";

/**
 * One filter, titled with the vendor question it answers, so the purpose of each filter is
 * obvious at a glance. The per-section Clear is always laid out (just hidden when inactive),
 * so toggling it never shifts the heading.
 */
export function FilterSection({
  title,
  question,
  active,
  onClear,
  children,
}: {
  title: string;
  question: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-2.5 px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm leading-5 font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{question}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          tabIndex={active ? 0 : -1}
          aria-hidden={!active}
          aria-label={`Clear ${title} filter`}
          className={cn(
            "rounded-sm text-xs leading-5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            !active && "invisible",
          )}
        >
          Clear
        </button>
      </div>
      {children}
    </section>
  );
}

/** Single-choice segmented control. Clicking the active option keeps it (radio behavior). */
export function SegmentedFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={value}
      onValueChange={(next) => next && onChange(next)}
      aria-label={label}
      className="w-full"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="flex-1 px-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * Label, raw code, and count for one facet value. Zero-count values are dimmed: they only
 * render while selected, so the user can unselect them.
 * `field` is null when the values are already human labels (grouped offices).
 */
export function FacetOptionText({
  field,
  option,
}: {
  field: FacetField | null;
  option: FacetOption;
}) {
  const label = field && facetLabel(field, option.value);
  return (
    <>
      {/* The name truncates before the code does: vendors scan FSCs by code. */}
      <span
        className="flex min-w-0 flex-1 items-baseline gap-1.5"
        title={label ? `${label} (${option.value})` : option.value}
      >
        <span className="truncate">{label ?? option.value}</span>
        {label && (
          <span className="max-w-1/2 shrink-0 truncate text-xs text-muted-foreground">
            {option.value}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {option.count}
      </span>
    </>
  );
}

/** Classes shared by checkbox rows and command rows, so both lists line up identically. */
export function facetRowClassName(count: number) {
  return cn(
    "-mx-1 flex h-7 items-center gap-2 rounded-md px-1 text-sm",
    count === 0 && "opacity-50",
  );
}
