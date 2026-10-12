"use client";

import type { ReactTable } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Solicitation } from "@/lib/solicitation";

import type { features } from "./columns";
import { formatInteger } from "./format";

const PAGE_SIZES = [25, 50, 100, 200];

/** "1 to 50 of 1,234", previous and next, and a page size select. */
export function ResultsPagination({
  table,
  total,
}: {
  table: ReactTable<typeof features, Solicitation>;
  /** Undefined until the first page loads. */
  total: number | undefined;
}) {
  const { pageIndex, pageSize } = table.state.pagination;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total ?? 0);
  // A hand-edited URL can carry any size, and the select must still show it.
  const sizes = PAGE_SIZES.includes(pageSize)
    ? PAGE_SIZES
    : [...PAGE_SIZES, pageSize].sort((a, b) => a - b);

  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-t px-3 text-xs text-muted-foreground">
      <div className="tabular-nums" aria-live="polite">
        {total === undefined ? (
          <Skeleton className="h-3.5 w-28" />
        ) : total === 0 ? (
          "No results"
        ) : from > total ? (
          `Past the last page, ${formatInteger(total)} results`
        ) : (
          <>
            <span className="text-foreground">
              {formatInteger(from)} to {formatInteger(to)}
            </span>{" "}
            of {formatInteger(total)}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger
            size="sm"
            className="w-[72px] text-xs"
            aria-label="Rows per page"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {sizes.map((size) => (
              <SelectItem key={size} value={String(size)} className="text-xs">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={total === undefined || !table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={total === undefined || !table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
