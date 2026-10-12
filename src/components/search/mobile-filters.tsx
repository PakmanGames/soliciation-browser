"use client";

import { SlidersHorizontalIcon } from "lucide-react";

import { FilterPanel } from "@/components/filters/filter-panel";
import { countActiveFilters } from "@/components/filters/filter-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQueryState, useSolicitations } from "@/lib/api";

/**
 * Below 768px the sidebar is hidden, so filters open in a sheet from this button instead.
 * It lives next to the search box so mobile gets filters without changing the page layout.
 */
export function MobileFilters() {
  const [query] = useQueryState();
  const { data } = useSolicitations(query);
  const activeCount = countActiveFilters(query);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className="md:hidden">
          <SlidersHorizontalIcon data-icon="inline-start" />
          Filters
          {activeCount > 0 && (
            <Badge className="h-4.5 min-w-4.5 px-1 tabular-nums">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="gap-0 bg-background p-0 data-[side=left]:w-[85vw] data-[side=left]:max-w-sm"
      >
        <SheetTitle className="sr-only">Filters</SheetTitle>
        <SheetDescription className="sr-only">
          Narrow the solicitations list.
        </SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FilterPanel />
        </div>
        <SheetFooter className="border-t p-3">
          <SheetClose asChild>
            <Button size="lg">
              {data
                ? `Show ${data.total.toLocaleString()} ${data.total === 1 ? "result" : "results"}`
                : "Show results"}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
