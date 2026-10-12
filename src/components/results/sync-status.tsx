"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryState, useSolicitations } from "@/lib/api";
import { cn } from "@/lib/utils";

import { formatAgo, formatTimestamp } from "./format";
import { useMinuteClock } from "./use-client-clock";

/** Response of `POST /api/refresh` (WS2). `errors` may be a list or a count. */
interface RefreshResult {
  inserted?: number;
  errors?: unknown[] | number;
}

/** Data freshness ("Synced 12 min ago") and a Refresh button that ingests today's RFQs. */
export function SyncStatus() {
  const [query] = useQueryState();
  const { data } = useSolicitations(query);
  const now = useMinuteClock();
  const queryClient = useQueryClient();

  const refresh = useMutation({
    mutationFn: async (): Promise<RefreshResult | null> => {
      const response = await fetch("/api/refresh", { method: "POST" });
      // 404 or 405 means the endpoint is not deployed yet, which is not a failure.
      if (response.status === 404 || response.status === 405) return null;
      if (!response.ok) throw new Error(`Refresh failed (${response.status})`);
      return response.json();
    },
    onSuccess: async (result) => {
      if (!result) {
        toast.info("Refresh not available yet");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["solicitations"] });
      const errors = Array.isArray(result.errors)
        ? result.errors.length
        : (result.errors ?? 0);
      const inserted = result.inserted ?? 0;
      const summary = `Pulled ${inserted.toLocaleString("en-US")} RFQ${inserted === 1 ? "" : "s"} from DIBBS`;
      if (errors > 0)
        toast.warning(summary, {
          description: `${errors} part${errors === 1 ? "" : "s"} failed; existing data is untouched.`,
        });
      else toast.success(summary);
    },
    onError: (error) =>
      toast.error("Refresh failed", { description: error.message }),
  });

  const lastSyncedAt = data?.lastSyncedAt;

  return (
    <div className="flex items-center gap-2">
      {data === undefined || now === null ? (
        <Skeleton className="h-4 w-28" />
      ) : lastSyncedAt ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-xs text-muted-foreground tabular-nums">
              Synced {formatAgo(lastSyncedAt, now)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {formatTimestamp(lastSyncedAt)}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-xs text-muted-foreground">Never synced</span>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={refresh.isPending}
        onClick={() => refresh.mutate()}
        aria-label="Refresh from DIBBS"
      >
        <RefreshCwIcon className={cn(refresh.isPending && "animate-spin")} />
        <span className="hidden sm:inline">
          {refresh.isPending ? "Refreshing" : "Refresh"}
        </span>
      </Button>
    </div>
  );
}
