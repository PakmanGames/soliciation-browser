"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useQueryState, useSolicitations } from "@/lib/api";

/** Stub owned by WS4: FSC facet as plain checkboxes. */
export function FilterPanel() {
  const [query, setQuery] = useQueryState();
  const { data } = useSolicitations(query);
  const selected = query.fsc ?? [];

  const toggle = (value: string, checked: boolean) => {
    const next = checked
      ? [...selected, value]
      : selected.filter((fsc) => fsc !== value);
    setQuery({ fsc: next.length > 0 ? next : undefined });
  };

  return (
    <div className="space-y-2 p-4">
      <h2 className="text-sm font-medium">FSC</h2>
      {data?.facets.fsc.map(({ value, count }) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(value)}
            onCheckedChange={(checked) => toggle(value, checked === true)}
          />
          <span className="flex-1">{value}</span>
          <span className="text-muted-foreground tabular-nums">{count}</span>
        </label>
      ))}
    </div>
  );
}
