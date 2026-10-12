"use client";

import { useQueryState, useSolicitations } from "@/lib/api";

/** Stub owned by WS3: plain list of the current page. */
export function ResultsTable() {
  const [query] = useQueryState();
  const { data, error, isPending } = useSolicitations(query);

  if (isPending)
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return <p className="p-4 text-sm text-destructive">{error.message}</p>;

  return (
    <div className="p-4 text-sm">
      <p className="mb-2 text-muted-foreground">{data.total} solicitations</p>
      <ul className="space-y-1 font-mono">
        {data.items.map((row) => (
          <li key={row.id}>
            {row.solicitationNumber} · {row.nsn ?? "-"} ·{" "}
            {row.nomenclature ?? "-"} · due {row.returnByDate ?? "-"}
          </li>
        ))}
      </ul>
    </div>
  );
}
