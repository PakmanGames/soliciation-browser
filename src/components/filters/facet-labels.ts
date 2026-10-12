import type { FacetField } from "@/lib/query";
import { fscLabel, officeLabel, setAsideLabel } from "@/lib/reference";

/**
 * Human label for a facet code from the WS5 reference data, or null when the code is
 * unknown, so callers show the raw code alone instead of repeating it.
 */
export function facetLabel(field: FacetField, code: string): string | null {
  const label = LABELS[field](code);
  return label && label !== code ? label : null;
}

const LABELS: Record<FacetField, (code: string) => string> = {
  fsc: fscLabel,
  office: (code) => officeLabel(code).short,
  setAside: setAsideLabel,
};
