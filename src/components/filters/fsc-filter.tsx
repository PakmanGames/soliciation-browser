"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { FacetSkeleton } from "@/components/filters/facet-checklist";
import { facetLabel } from "@/components/filters/facet-labels";
import {
  FacetOptionText,
  facetRowClassName,
} from "@/components/filters/filter-section";
import type { FacetOption } from "@/components/filters/filter-state";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const TOP_COUNT = 8;

/**
 * Product category (FSC) multi-select. A vendor sells into a handful of the hundreds of
 * classes, so only the 8 largest show up front and the long tail sits behind search.
 */
export function FscFilter({
  options,
  selected,
  loading,
  onToggle,
}: {
  options: FacetOption[];
  selected: string[];
  loading: boolean;
  onToggle: (value: string, checked: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  // Selected values stay visible past the cutoff, appended so the list never reorders on click.
  const visible = term
    ? options.filter((option) =>
        `${option.value} ${facetLabel("fsc", option.value) ?? ""}`
          .toLowerCase()
          .includes(term),
      )
    : options.filter(
        (option, index) => index < TOP_COUNT || selected.includes(option.value),
      );
  const hidden = options.length - visible.length;

  return (
    // -mx-1 cancels the input wrapper's p-1 so the box lines up with the other sections.
    // Rows are highlighted only while the list has focus; cmdk always marks one as selected.
    <Command
      shouldFilter={false}
      className="group/fsc -mx-1 h-auto w-auto rounded-none! bg-transparent p-0"
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        name="fscSearch"
        placeholder="Search FSC code or name"
        aria-label="Search product categories"
      />
      <CommandList className="mt-1.5 max-h-64 px-1">
        {loading ? (
          <FacetSkeleton />
        ) : (
          <>
            <CommandEmpty className="py-2 text-left text-xs text-muted-foreground">
              {term ? "No matching categories" : "No values in results"}
            </CommandEmpty>
            {visible.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => onToggle(option.value, !checked)}
                  aria-checked={checked}
                  className={cn(
                    facetRowClassName(option.count),
                    "mx-0 cursor-pointer py-0 hover:bg-muted data-selected:bg-transparent group-focus-within/fsc:data-selected:bg-muted [&>svg:last-child]:hidden",
                  )}
                >
                  <span
                    aria-hidden
                    data-checked={checked || undefined}
                    className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-primary-foreground data-checked:border-primary data-checked:bg-primary"
                  >
                    {checked && <CheckIcon className="size-3.5" />}
                  </span>
                  <FacetOptionText field="fsc" option={option} />
                </CommandItem>
              );
            })}
          </>
        )}
      </CommandList>
      {!loading && !term && hidden > 0 && (
        <p className="px-1 pt-1 text-xs text-muted-foreground">
          {hidden} more {hidden === 1 ? "class" : "classes"}, search to find
          them
        </p>
      )}
    </Command>
  );
}
