"use client";

import { Input } from "@/components/ui/input";
import { useQueryState } from "@/lib/api";

/**
 * Stub owned by WS4: writes every keystroke to `q`. WS4 adds debouncing.
 * Uncontrolled on purpose: a hand-edited URL is a full page load, which re-reads `q`.
 */
export function SearchBox() {
  const [query, setQuery] = useQueryState();

  return (
    <Input
      type="search"
      name="q"
      defaultValue={query.q ?? ""}
      onChange={(event) => setQuery({ q: event.target.value })}
      placeholder="Search solicitation, NSN, nomenclature, part number"
      aria-label="Search solicitations"
    />
  );
}
