import { Suspense } from "react";

import { FilterPanel } from "@/components/filters/filter-panel";
import { ResultsTable } from "@/components/results/results-table";
import { SyncStatus } from "@/components/results/sync-status";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * App shell. Each slot reads the URL through `useSearchParams`, which needs a Suspense
 * boundary. Fallbacks match the loaded size so the page does not shift on hydration.
 * The slots take no props, so WS3 and WS4 can rewrite them without touching this file.
 */
export default function Page() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <h1 className="text-base font-semibold tracking-tight">
          Solicitation Browser
        </h1>
        <Suspense fallback={<Skeleton className="h-4 w-40" />}>
          <SyncStatus />
        </Suspense>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r md:block">
          <Suspense fallback={<Skeleton className="m-4 h-64" />}>
            <FilterPanel />
          </Suspense>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b p-3">
            <Suspense fallback={<Skeleton className="h-9 w-full" />}>
              <SearchBox />
            </Suspense>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <Suspense fallback={null}>
              <ResultsTable />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
