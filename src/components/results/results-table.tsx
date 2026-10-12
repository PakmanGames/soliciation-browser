"use client";

import {
  useTable,
  type PaginationState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  SearchXIcon,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState, useSolicitations } from "@/lib/api";
import {
  DEFAULT_QUERY,
  type SolicitationPage,
  type SolicitationQuery,
} from "@/lib/query";
import type { Solicitation } from "@/lib/solicitation";
import { cn } from "@/lib/utils";

import { columnClassNames, columns, features } from "./columns";
import { ResultsPagination } from "./results-pagination";
import { useHydrated } from "./use-client-clock";

const NO_ROWS: Solicitation[] = [];
const SKELETON_ROWS = 20;

/** Every filter in the query contract; sort and page size are view settings and stay. */
const CLEARED_FILTERS = {
  q: undefined,
  issuedFrom: undefined,
  issuedTo: undefined,
  dueWithinDays: undefined,
  includeExpired: undefined,
  fsc: undefined,
  setAside: undefined,
  office: undefined,
  qtyMin: undefined,
  qtyMax: undefined,
  hasTechDocs: undefined,
} satisfies Partial<SolicitationQuery>;

function getRowId(row: Solicitation) {
  return row.id;
}

function resolve<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function"
    ? (updater as (old: T) => T)(current)
    : updater;
}

/**
 * The results grid. The URL owns sort and page (through `useQueryState`) and the server
 * does the work, so TanStack Table runs in manual mode and only maps header and pager
 * clicks onto `setQuery`.
 */
export function ResultsTable() {
  const [query, setQuery] = useQueryState();
  const result = useSolicitations(query);
  const hydrated = useHydrated();

  // Placeholder data covers loading but not errors: a failed request leaves `data`
  // undefined. Keep the last good page so an API hiccup never blanks the table.
  const [lastGood, setLastGood] = useState<SolicitationPage>();
  if (result.data && result.data !== lastGood) setLastGood(result.data);
  const view = hydrated ? (result.data ?? lastGood) : undefined;
  const error = hydrated ? result.error : null;
  const { isFetching, isPlaceholderData, refetch } = result;

  const scrollRef = useRef<HTMLDivElement>(null);
  const sortId = query.sort ?? DEFAULT_QUERY.sort;
  const sortDir = query.dir ?? DEFAULT_QUERY.dir;
  const page = query.page ?? DEFAULT_QUERY.page;
  const pageSize = query.pageSize ?? DEFAULT_QUERY.pageSize;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortId, desc: sortDir === "desc" }],
    [sortId, sortDir],
  );
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize],
  );

  const table = useTable({
    features,
    columns,
    data: view?.items ?? NO_ROWS,
    getRowId,
    rowCount: view?.total ?? 0,
    state: { sorting, pagination },
    manualSorting: true,
    manualPagination: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    onSortingChange: (updater) => {
      const [next] = resolve(updater, sorting);
      if (!next) return;
      setQuery({
        sort: next.id as SolicitationQuery["sort"],
        dir: next.desc ? "desc" : "asc",
      });
      scrollRef.current?.scrollTo({ top: 0 });
    },
    onPaginationChange: (updater) => {
      const next = resolve(updater, pagination);
      setQuery({ page: next.pageIndex + 1, pageSize: next.pageSize });
      scrollRef.current?.scrollTo({ top: 0 });
    },
  });

  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const hasFilters = (
    Object.keys(CLEARED_FILTERS) as (keyof SolicitationQuery)[]
  ).some(
    (key) =>
      query[key] !== undefined &&
      query[key] !== (DEFAULT_QUERY as SolicitationQuery)[key],
  );

  let message: ReactNode = null;
  if (!view && error) {
    message = (
      <StateMessage
        icon={<CircleAlertIcon className="text-destructive" />}
        title="Could not load solicitations"
        detail={error.message}
        action={
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  } else if (view && view.items.length === 0) {
    message =
      view.total > 0 ? (
        <StateMessage
          title="This page is past the last result"
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery({})}>
              Go to the first page
            </Button>
          }
        />
      ) : hasFilters ? (
        <StateMessage
          icon={<SearchXIcon />}
          title="No solicitations match"
          detail="Try a shorter search or fewer filters."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuery(CLEARED_FILTERS)}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <StateMessage
          icon={<SearchXIcon />}
          title="No open solicitations yet"
          detail="Pull the latest RFQs from DIBBS with Refresh."
        />
      );
  }

  return (
    <div className="flex h-full flex-col">
      {error && view && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive"
        >
          <CircleAlertIcon className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Could not update results. Showing the last loaded page.
          </span>
          <Button
            size="xs"
            variant="outline"
            className="shrink-0"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {view && isFetching && (
          <div
            role="status"
            aria-label="Loading results"
            className="absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-primary/60"
          />
        )}
        <div ref={scrollRef} className="h-full overflow-auto">
          <table className="w-full min-w-[1040px] table-fixed border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                {headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                      className={cn(
                        "sticky top-0 z-10 h-9 bg-background px-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]",
                        columnClassNames[header.column.id],
                      )}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "group/sort -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                            sorted && "text-foreground",
                          )}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 opacity-0 group-hover/sort:opacity-50 group-focus-visible/sort:opacity-50" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody
              className={cn(
                "transition-opacity duration-150",
                isPlaceholderData && "opacity-60",
              )}
            >
              {view
                ? table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="group/row hover:bg-muted/50">
                      {row.getAllCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "h-9 overflow-hidden border-b px-3 py-0 whitespace-nowrap",
                            columnClassNames[cell.column.id],
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))
                : !error &&
                  Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr key={index}>
                      {headers.map((header) => (
                        <td
                          key={header.id}
                          className={cn(
                            "h-9 border-b px-3 py-0",
                            columnClassNames[header.column.id],
                          )}
                        >
                          <Skeleton className="ml-auto h-3.5 w-full max-w-24 [td:not(.text-right)>&]:ml-0" />
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
          {message}
        </div>
      </div>
      <ResultsPagination table={table} total={view?.total} />
    </div>
  );
}

/** Centered in the visible width even when the table scrolls sideways on mobile. */
function StateMessage({
  icon,
  title,
  detail,
  action,
}: {
  icon?: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sticky left-0 flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
      {icon && (
        <div className="text-muted-foreground/70 [&_svg]:size-7">{icon}</div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}
