"use client";

import { useId } from "react";

import { FacetChecklist } from "@/components/filters/facet-checklist";
import {
  FilterSection,
  SegmentedFilter,
} from "@/components/filters/filter-section";
import {
  CLEARED_FILTERS,
  countActiveFilters,
  daysAgo,
  facetOptions,
  formatDay,
  officeGroupSelected,
  officeGroups,
  useHydrated,
} from "@/components/filters/filter-state";
import { FscFilter } from "@/components/filters/fsc-filter";
import { QuantityFilter } from "@/components/filters/quantity-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryState, useSolicitations } from "@/lib/api";
import type { FacetField } from "@/lib/query";

const DUE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
] as const;

// "N days" means the last N calendar days including today, so it maps to issuedFrom = today - (N - 1).
const ISSUED_OPTIONS = [
  { value: "any", label: "Any", daysBack: undefined },
  { value: "today", label: "Today", daysBack: 0 },
  { value: "3", label: "3 days", daysBack: 2 },
  { value: "7", label: "7 days", daysBack: 6 },
] as const;

const TECH_DOCS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "yes", label: "Has docs" },
  { value: "no", label: "No docs" },
] as const;

/**
 * Filters ordered by the questions a vendor asks when triaging RFQs: can I still quote it,
 * is it new, do I sell it, am I eligible, who is buying, is it my size, can I make it.
 * All state lives in the URL via `useQueryState`, so every control survives reload and
 * resyncs on back and forward.
 */
export function FilterPanel() {
  const [query, setQuery] = useQueryState();
  const { data } = useSolicitations(query);
  const includeExpiredId = useId();
  const activeCount = countActiveFilters(query);
  const hydrated = useHydrated();
  const loading = !data || !hydrated;

  // Presets are relative to today, so a shared link from another day may match none of them.
  // The server's "today" can differ from the browser's, so matching waits for hydration.
  const issuedValue =
    query.issuedFrom === undefined && query.issuedTo === undefined
      ? "any"
      : query.issuedTo === undefined && hydrated
        ? (ISSUED_OPTIONS.find(
            (option) =>
              option.daysBack !== undefined &&
              daysAgo(option.daysBack) === query.issuedFrom,
          )?.value ?? "")
        : "";

  const toggleFacet =
    (field: FacetField) => (value: string, checked: boolean) => {
      const current = query[field] ?? [];
      const next = checked
        ? [...current, value]
        : current.filter((item) => item !== value);
      setQuery({ [field]: next.length > 0 ? next : undefined });
    };

  // A center counts as selected when any of its codes is, so unchecking always clears it.
  // Selected prefixes absent from the facets come back as zero-count options in their center.
  const offices = officeGroups(facetOptions(data?.facets.office, query.office));
  const selectedOffices = offices
    .filter((group) => officeGroupSelected(group, query.office))
    .map((group) => group.value);
  const toggleOffice = (center: string, checked: boolean) => {
    const group = offices.find((item) => item.value === center);
    if (!group) return;
    const rest = (query.office ?? []).filter(
      (value) => !group.codes.some((code) => code.startsWith(value)),
    );
    const next = checked ? [...rest, ...group.prefixes] : rest;
    setQuery({ office: next.length > 0 ? next : undefined });
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Filters</h2>
          {activeCount > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {activeCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="xs"
          disabled={activeCount === 0}
          onClick={() => setQuery(CLEARED_FILTERS)}
        >
          Clear all
        </Button>
      </div>

      <div className="divide-y">
        <FilterSection
          title="Due within"
          question="Can I still quote this?"
          active={query.dueWithinDays !== undefined || !!query.includeExpired}
          onClear={() =>
            setQuery({ dueWithinDays: undefined, includeExpired: false })
          }
        >
          <SegmentedFilter
            label="Due within"
            value={
              query.dueWithinDays === undefined
                ? "any"
                : String(query.dueWithinDays)
            }
            options={DUE_OPTIONS}
            onChange={(value) =>
              setQuery({
                dueWithinDays: value === "any" ? undefined : Number(value),
              })
            }
          />
          <div className="flex items-center gap-2">
            {/* A due window already starts today, so expired rows cannot match it. */}
            <Checkbox
              id={includeExpiredId}
              checked={!!query.includeExpired}
              disabled={query.dueWithinDays !== undefined}
              onCheckedChange={(checked) =>
                setQuery({ includeExpired: checked === true })
              }
            />
            <label
              htmlFor={includeExpiredId}
              className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              Include expired
            </label>
          </div>
        </FilterSection>

        <FilterSection
          title="Issued"
          question="What is new?"
          active={issuedValue !== "any"}
          onClear={() =>
            setQuery({ issuedFrom: undefined, issuedTo: undefined })
          }
        >
          <SegmentedFilter
            label="Issued"
            value={issuedValue}
            options={ISSUED_OPTIONS}
            onChange={(value) => {
              const option = ISSUED_OPTIONS.find(
                (item) => item.value === value,
              );
              setQuery({
                issuedFrom:
                  option?.daysBack === undefined
                    ? undefined
                    : daysAgo(option.daysBack),
                issuedTo: undefined,
              });
            }}
          />
          {issuedValue !== "any" && (query.issuedFrom || query.issuedTo) && (
            <p className="text-xs text-muted-foreground">
              {query.issuedFrom && query.issuedTo
                ? `${formatDay(query.issuedFrom)} to ${formatDay(query.issuedTo)}`
                : query.issuedFrom
                  ? `Since ${formatDay(query.issuedFrom)}`
                  : `Through ${formatDay(query.issuedTo!)}`}
            </p>
          )}
        </FilterSection>

        <FilterSection
          title="Product category"
          question="Is this something I sell?"
          active={!!query.fsc?.length}
          onClear={() => setQuery({ fsc: undefined })}
        >
          <FscFilter
            options={facetOptions(data?.facets.fsc, query.fsc)}
            selected={query.fsc ?? []}
            loading={loading}
            onToggle={toggleFacet("fsc")}
          />
        </FilterSection>

        <FilterSection
          title="Set-aside"
          question="Am I eligible?"
          active={!!query.setAside?.length}
          onClear={() => setQuery({ setAside: undefined })}
        >
          <FacetChecklist
            field="setAside"
            options={facetOptions(data?.facets.setAside, query.setAside)}
            selected={query.setAside ?? []}
            loading={loading}
            onToggle={toggleFacet("setAside")}
          />
        </FilterSection>

        <FilterSection
          title="Buying office"
          question="Who is buying?"
          active={!!query.office?.length}
          onClear={() => setQuery({ office: undefined })}
        >
          <FacetChecklist
            field={null}
            options={offices}
            selected={selectedOffices}
            loading={loading}
            onToggle={toggleOffice}
          />
        </FilterSection>

        <FilterSection
          title="Quantity"
          question="Is it my size?"
          active={query.qtyMin !== undefined || query.qtyMax !== undefined}
          onClear={() => setQuery({ qtyMin: undefined, qtyMax: undefined })}
        >
          <QuantityFilter query={query} setQuery={setQuery} />
        </FilterSection>

        <FilterSection
          title="Technical documents"
          question="Can I make it?"
          active={query.hasTechDocs !== undefined}
          onClear={() => setQuery({ hasTechDocs: undefined })}
        >
          <SegmentedFilter
            label="Technical documents"
            value={
              query.hasTechDocs === undefined
                ? "any"
                : query.hasTechDocs
                  ? "yes"
                  : "no"
            }
            options={TECH_DOCS_OPTIONS}
            onChange={(value) =>
              setQuery({
                hasTechDocs: value === "any" ? undefined : value === "yes",
              })
            }
          />
        </FilterSection>
      </div>
    </div>
  );
}
