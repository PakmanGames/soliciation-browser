/**
 * One RFQ line item posted on DIBBS.
 * Produced by `src/server/dibbs`, stored by `src/server/db`, rendered by the UI.
 * Changes to this contract go through the lead, because every workstream depends on it.
 */
export interface Solicitation {
  /** Deterministic and stable across re-ingests, e.g. `${solicitationNumber}:${nsn}`. */
  id: string;
  /** Uppercase, no spaces or dashes, e.g. "SPE7M126T1234". */
  solicitationNumber: string;
  /** 13 digits, no dashes. Null only when DIBBS lists a part number without an NSN. */
  nsn: string | null;
  /** Manufacturer part number when DIBBS shows one. */
  partNumber: string | null;
  /** Federal Supply Class: first 4 digits of the NSN. */
  fsc: string | null;
  /** Item name as DIBBS shows it, trimmed, e.g. "SCREW,CAP,HEXAGON HEAD". */
  nomenclature: string | null;
  quantity: number | null;
  /** e.g. "EA". */
  unitOfIssue: string | null;
  purchaseRequestNumber: string | null;
  /** "YYYY-MM-DD". */
  issueDate: string;
  /** Quote due date, "YYYY-MM-DD". */
  returnByDate: string | null;
  /** Raw DIBBS set-aside value, or null if the source does not expose it. */
  setAside: string | null;
  /** Whether DIBBS lists technical documents (drawings, specs) for the item. */
  hasTechnicalDocuments: boolean | null;
  /** Opens this RFQ on DIBBS, verified to work from a fresh browser session. */
  dibbsUrl: string;
  /** Solicitation document, if DIBBS links one. */
  pdfUrl: string | null;
  /** Other fields captured cheaply. The UI ignores these until they are promoted to real fields. */
  extra: Record<string, string>;
  /** ISO timestamp of when this record was fetched. */
  fetchedAt: string;
}
