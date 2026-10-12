import { useSyncExternalStore } from "react";

import { facetLabel } from "@/components/filters/facet-labels";
import type { SolicitationPage, SolicitationQuery } from "@/lib/query";

const subscribeNever = () => () => {};

/**
 * False on the server and during hydration, true afterwards.
 * Each slot hydrates in its own Suspense boundary, so the shared query can resolve before
 * this one hydrates; TanStack Query then hands hydration live data the server never had.
 * Anything derived from fetched data or from "today" waits for this flag to avoid a mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/** Patch that resets every filter but keeps the search text and sort. */
export const CLEARED_FILTERS = {
  dueWithinDays: undefined,
  includeExpired: false,
  issuedFrom: undefined,
  issuedTo: undefined,
  fsc: undefined,
  setAside: undefined,
  office: undefined,
  qtyMin: undefined,
  qtyMax: undefined,
  hasTechDocs: undefined,
} satisfies Partial<SolicitationQuery>;

/** Number of filter sections with an active value, as shown on "Filters" badges. */
export function countActiveFilters(query: SolicitationQuery): number {
  return [
    query.dueWithinDays !== undefined || query.includeExpired === true,
    query.issuedFrom !== undefined || query.issuedTo !== undefined,
    Boolean(query.fsc?.length),
    Boolean(query.setAside?.length),
    Boolean(query.office?.length),
    query.qtyMin !== undefined || query.qtyMax !== undefined,
    query.hasTechDocs !== undefined,
  ].filter(Boolean).length;
}

export interface FacetOption {
  value: string;
  count: number;
}

/**
 * Facet values to render, in the API's order (count descending).
 * Selected values the API no longer returns are appended with a zero count, so the user
 * can always unselect them; unselected zero-count values are dropped.
 */
export function facetOptions(
  facet: SolicitationPage["facets"][keyof SolicitationPage["facets"]] = [],
  selected: string[] = [],
): FacetOption[] {
  const options = facet.filter(
    ({ value, count }) => count > 0 || selected.includes(value),
  );
  for (const value of selected) {
    if (!options.some((option) => option.value === value))
      options.push({ value, count: 0 });
  }
  return options;
}

export interface OfficeGroup extends FacetOption {
  /** Buying office codes (DoDAACs) under this center, as stored in the URL. */
  codes: string[];
}

/**
 * Buying offices grouped by DLA center, in descending count order.
 * Vendors think "Land and Maritime", not its DoDAACs (SPE7L1, SPE7M2, ...), and several
 * codes share one center, so one row per center selects all of its codes.
 */
export function officeGroups(options: FacetOption[]): OfficeGroup[] {
  const groups = new Map<string, OfficeGroup>();
  for (const { value, count } of options) {
    const center = facetLabel("office", value) ?? value;
    const group = groups.get(center) ?? { value: center, count: 0, codes: [] };
    group.count += count;
    group.codes.push(value);
    groups.set(center, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

/** Local calendar date `days` before today, as "YYYY-MM-DD". */
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-10-09" -> "Fri, Oct 9". */
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
