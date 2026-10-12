"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { SolicitationPage, SolicitationQuery } from "@/lib/query";
import { parseQuery, serializeQuery } from "@/lib/query";

/**
 * The URL is the single source of truth for the current query, so filtered views are
 * shareable and survive reload. Components read and write it through this hook only.
 *
 * `setQuery(patch)` merges the patch into the current query and resets `page` to 1
 * unless the patch sets it. Set a field to `undefined` to clear it.
 * Each change is a new history entry, so the back button steps back through them.
 */
export function useQueryState(): [
  SolicitationQuery,
  (patch: Partial<SolicitationQuery>) => void,
] {
  const searchParams = useSearchParams();

  const query = useMemo(
    () => parseQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setQuery = useCallback((patch: Partial<SolicitationQuery>) => {
    // Read the live URL instead of the rendered `query`, so a debounced call that fires
    // late (search box) cannot revert a change made in the meantime (filter click).
    const current = parseQuery(new URLSearchParams(window.location.search));
    const params = serializeQuery({ ...current, page: 1, ...patch }).toString();
    const search = params ? `?${params}` : "";
    // A no-op change (clicking the selected option) must not add a history entry.
    if (search === window.location.search) return;
    // The native history API instead of `router.push`: Next.js syncs `useSearchParams`
    // with it, and it skips the server round trip a router navigation makes before the
    // API request can even start.
    window.history.pushState(null, "", `${window.location.pathname}${search}`);
  }, []);

  return [query, setQuery];
}

/**
 * Fetches one page of results. Previous results stay on screen while the next query
 * loads (`isPlaceholderData` is true meanwhile), so typing and filtering never flash empty.
 */
export function useSolicitations(query: SolicitationQuery) {
  const params = serializeQuery(query).toString();
  return useQuery({
    queryKey: ["solicitations", params],
    queryFn: async ({ signal }): Promise<SolicitationPage> => {
      const response = await fetch(`/api/solicitations?${params}`, { signal });
      if (!response.ok)
        throw new Error(`Failed to load solicitations (${response.status})`);
      return response.json();
    },
    placeholderData: keepPreviousData,
  });
}
