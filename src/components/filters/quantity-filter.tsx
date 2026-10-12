"use client";

import { useDebouncedInput } from "@/components/search/use-debounced-input";
import { Input } from "@/components/ui/input";
import type { SolicitationQuery } from "@/lib/query";

/** Keeps whole numbers only, in the canonical form `parseQuery` produces ("007" -> "7"). */
const normalizeQuantity = (raw: string) =>
  /^\d+$/.test(raw.trim()) ? String(Number(raw.trim())) : "";

const toQuantity = (value: string) => (value ? Number(value) : undefined);

/** Min and max quantity inputs, each debounced into the URL. */
export function QuantityFilter({
  query,
  setQuery,
}: {
  query: SolicitationQuery;
  setQuery: (patch: Partial<SolicitationQuery>) => void;
}) {
  const min = useDebouncedInput(
    query.qtyMin?.toString() ?? "",
    (value) => setQuery({ qtyMin: toQuantity(value) }),
    normalizeQuantity,
  );
  const max = useDebouncedInput(
    query.qtyMax?.toString() ?? "",
    (value) => setQuery({ qtyMax: toQuantity(value) }),
    normalizeQuantity,
  );

  return (
    <div className="flex items-center gap-2">
      <QuantityInput
        label="Minimum quantity"
        name="qtyMin"
        placeholder="Min"
        value={min.text}
        onChange={min.setText}
        onEnter={() => min.commitNow(min.text)}
      />
      <span className="text-muted-foreground" aria-hidden>
        -
      </span>
      <QuantityInput
        label="Maximum quantity"
        name="qtyMax"
        placeholder="Max"
        value={max.text}
        onChange={max.setText}
        onEnter={() => max.commitNow(max.text)}
      />
    </div>
  );
}

function QuantityInput({
  label,
  name,
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      aria-label={label}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.key === "Enter" && onEnter()}
      className="h-8 [appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}
