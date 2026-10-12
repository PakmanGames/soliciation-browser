"use client";

import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fscLabel, setAsideLabel } from "@/lib/reference";
import type { Solicitation } from "@/lib/solicitation";
import { cn } from "@/lib/utils";

import {
  daysUntil,
  formatInteger,
  formatLongDate,
  formatNsn,
  formatShortDate,
} from "./format";
import { useMinuteClock } from "./use-client-clock";

/**
 * Sorting and pagination state live in the URL and the server does the work, so the
 * table registers the features only for their state and handlers (`manual*` options).
 */
export const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
});

const column = createColumnHelper<typeof features, Solicitation>();

/**
 * Sortable column ids are the `sort` values of the query contract, so a header click
 * maps straight onto `setQuery({ sort: column.id })`.
 */
export const columns = column.columns([
  column.accessor("solicitationNumber", {
    header: "Solicitation",
    cell: ({ row }) => (
      <a
        href={row.original.dibbsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono underline-offset-2 hover:underline"
      >
        {row.original.solicitationNumber}
      </a>
    ),
  }),
  column.accessor("nsn", {
    header: "NSN",
    enableSorting: false,
    cell: ({ row }) => <NsnCell item={row.original} />,
  }),
  column.accessor("nomenclature", {
    header: "Nomenclature",
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? <TruncatedText text={value} /> : <Empty />;
    },
  }),
  column.accessor("fsc", {
    header: "FSC",
    enableSorting: false,
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? <FscCell fsc={value} /> : <Empty />;
    },
  }),
  column.accessor("quantity", {
    header: "Qty",
    sortDescFirst: true,
    cell: ({ row }) => {
      const { quantity, unitOfIssue } = row.original;
      if (quantity === null) return <Empty />;
      return (
        <span className="tabular-nums">
          {formatInteger(quantity)}
          <span className="ml-1 inline-block w-5 text-left text-[11px] text-muted-foreground">
            {unitOfIssue}
          </span>
        </span>
      );
    },
  }),
  column.accessor("setAside", {
    header: "Set-aside",
    enableSorting: false,
    cell: ({ getValue }) => <SetAsideCell value={getValue()} />,
  }),
  column.accessor("issueDate", {
    header: "Issued",
    sortDescFirst: true,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatShortDate(getValue())}</span>
    ),
  }),
  column.accessor("returnByDate", {
    id: "dueDate",
    header: "Due",
    cell: ({ getValue }) => <DueCell date={getValue()} />,
  }),
  column.display({
    id: "dibbs",
    header: () => <span className="sr-only">Open on DIBBS</span>,
    cell: ({ row }) => <DibbsButton item={row.original} />,
  }),
]);

/**
 * Fixed widths (with `table-fixed`) keep columns from jumping as pages load.
 * Nomenclature has no width, so it takes whatever space is left.
 */
export const columnClassNames: Record<string, string> = {
  solicitationNumber: "w-[136px]",
  nsn: "w-[164px]",
  nomenclature: "",
  fsc: "w-[64px]",
  quantity: "w-[104px] text-right",
  setAside: "w-[148px]",
  issueDate: "w-[72px]",
  dueDate: "w-[132px]",
  dibbs: "w-[44px] pr-2 text-right",
};

function Empty() {
  return <span className="text-muted-foreground/60">-</span>;
}

function NsnCell({ item }: { item: Solicitation }) {
  if (!item.nsn) {
    if (!item.partNumber) return <Empty />;
    return (
      <span className="block truncate font-mono text-muted-foreground">
        <span className="mr-1 font-sans text-[11px]">P/N</span>
        {item.partNumber}
      </span>
    );
  }

  const nsn = formatNsn(item.nsn);
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono">{nsn}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Copy NSN ${nsn}`}
        className="text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        onClick={() => copyNsn(nsn)}
      >
        <CopyIcon />
      </Button>
    </span>
  );
}

async function copyNsn(nsn: string) {
  try {
    await navigator.clipboard.writeText(nsn);
    toast.success(`Copied NSN ${nsn}`);
  } catch {
    toast.error("Could not copy to the clipboard");
  }
}

/** Single-line text that shows the full value in a tooltip, but only when it is cut off. */
function TruncatedText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      open={open}
      delayDuration={300}
      onOpenChange={(next) => {
        const element = ref.current;
        setOpen(next && !!element && element.scrollWidth > element.clientWidth);
      }}
    >
      <TooltipTrigger asChild>
        <span ref={ref} className="block truncate">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function FscCell({ fsc }: { fsc: string }) {
  const code = <span className="font-mono tabular-nums">{fsc}</span>;
  const label = fscLabel(fsc);
  if (label === fsc) return code;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span className="cursor-default underline decoration-muted-foreground/40 decoration-dotted underline-offset-4">
          {code}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function SetAsideCell({ value }: { value: string | null }) {
  if (!value) return <Empty />;
  const label = setAsideLabel(value);
  // Most RFQs are unrestricted, so only real set-asides get a badge and stand out.
  if (label === "Unrestricted")
    return <span className="text-xs text-muted-foreground">{label}</span>;
  return (
    <Badge
      variant="secondary"
      className="max-w-full justify-start font-normal"
      title={label === value ? undefined : value}
    >
      <span className="truncate">{label}</span>
    </Badge>
  );
}

function DueCell({ date }: { date: string | null }) {
  const now = useMinuteClock();
  if (!date) return <Empty />;
  const days = now === null ? null : daysUntil(date, now);
  return (
    <span className="flex items-center gap-2" title={formatLongDate(date)}>
      <span
        className={cn(
          "w-11 shrink-0 tabular-nums",
          days !== null && days < 0 && "text-muted-foreground",
        )}
      >
        {formatShortDate(date)}
      </span>
      {days !== null && <DaysLeft days={days} />}
    </span>
  );
}

function DaysLeft({ days }: { days: number }) {
  if (days < 0)
    return <span className="text-xs text-muted-foreground">Expired</span>;
  const label = days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent tabular-nums",
        days <= 3
          ? "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          : days <= 7
            ? "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
            : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  );
}

function DibbsButton({ item }: { item: Solicitation }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
        >
          <a
            href={item.dibbsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${item.solicitationNumber} on DIBBS`}
          >
            <ExternalLinkIcon />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Open on DIBBS</TooltipContent>
    </Tooltip>
  );
}
