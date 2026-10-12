"use client";

import { useQueryState, useSolicitations } from "@/lib/api";

/** Stub owned by WS3: raw `lastSyncedAt`. */
export function SyncStatus() {
  const [query] = useQueryState();
  const { data } = useSolicitations(query);

  return (
    <span className="text-xs text-muted-foreground">
      Synced: {data?.lastSyncedAt ?? "never"}
    </span>
  );
}
