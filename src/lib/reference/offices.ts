/**
 * DLA buying activities, keyed by DoDAAC prefix (the first characters of a
 * solicitation number). Lookups use the longest matching prefix, so a new DoDAAC
 * like `SPE7M9` still resolves to Land and Maritime through `SPE7M`.
 *
 * The prefixes are every family seen in DIBBS RFQ index files for 2026-10-05 to
 * 2026-10-11 (10,250 rows). SPEFA is DLA Aviation's buying at the Navy Fleet
 * Readiness Centers: SAM.gov lists SPEFA5 under "DLA Aviation at Cherry Point, NC",
 * and SPEFA1/SPEFA3 deliver to San Diego and Jacksonville.
 */

export interface OfficeName {
  short: string;
  full: string;
}

export const OFFICES: Record<string, OfficeName> = {
  SPE4A: { short: "Aviation", full: "DLA Aviation, Richmond VA" },
  SPEFA: {
    short: "Aviation (Navy FRC)",
    full: "DLA Aviation at Navy Fleet Readiness Centers",
  },
  SPE7L: {
    short: "Land and Maritime",
    full: "DLA Land and Maritime, Columbus OH",
  },
  SPE7M: {
    short: "Land and Maritime",
    full: "DLA Land and Maritime, Columbus OH",
  },
  SPE1C: {
    short: "Troop Support Clothing",
    full: "DLA Troop Support Clothing and Textiles, Philadelphia PA",
  },
  SPE2D: {
    short: "Troop Support Medical",
    full: "DLA Troop Support Medical, Philadelphia PA",
  },
  SPE3S: {
    short: "Troop Support Subsistence",
    full: "DLA Troop Support Subsistence, Philadelphia PA",
  },
  SPE8E: {
    short: "Troop Support C&E",
    full: "DLA Troop Support Construction and Equipment, Philadelphia PA",
  },
};
