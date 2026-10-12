import type { FacetField } from "@/lib/query";

/**
 * Human label for a facet code, or null when only the raw code is known.
 * This is the single seam for WS5 reference data (`@/lib/reference`); until it lands on
 * main every code renders raw. To wire it in, replace `LABELS` with:
 *
 * `{ fsc: fscLabel, office: (code) => officeLabel(code).short, setAside: setAsideLabel }`
 */
export function facetLabel(field: FacetField, code: string): string | null {
  const label = LABELS[field](code);
  return label && label !== code ? label : null;
}

const LABELS: Record<FacetField, (code: string) => string | null> = {
  fsc: () => null,
  office: () => null,
  setAside: () => null,
};
