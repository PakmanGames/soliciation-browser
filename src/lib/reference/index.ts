/**
 * Human labels for the cryptic codes in DIBBS data. Every helper is pure, never
 * throws, and falls back to the raw code, so an unknown code still renders.
 * Inputs are typed as strings but tolerate a stray null from the database.
 */
import { FSC_NAMES, FSG_NAMES } from "./fsc";
import { OFFICES, type OfficeName } from "./offices";
import { SET_ASIDE_CODES, SET_ASIDE_PATTERNS } from "./set-aside";

export { FSC_NAMES, FSG_NAMES, OFFICES, SET_ASIDE_CODES };
export type { OfficeName };

// Own-key lookup, so a code like "constructor" never resolves to an Object method.
function lookup<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

function clean(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/** Federal Supply Group of a class: "5305" -> "53". */
export function fsgOf(fsc: string): string {
  return clean(fsc).slice(0, 2);
}

/** "5305" -> "Screws". */
export function fscLabel(fsc: string): string {
  return lookup(FSC_NAMES, clean(fsc)) ?? fsc;
}

/** "53" -> "Hardware and Abrasives". */
export function fsgLabel(fsg: string): string {
  return lookup(FSG_NAMES, clean(fsg)) ?? fsg;
}

/** Buying activity DoDAAC of a solicitation: "SPE7M126T1234" -> "SPE7M1". */
export function officeOf(solicitationNumber: string): string {
  return clean(solicitationNumber).slice(0, 6);
}

/** "SPE4A6" -> { short: "Aviation", full: "DLA Aviation, Richmond VA" }, by longest known prefix. */
export function officeLabel(code: string): OfficeName {
  const key = clean(code);
  for (let length = key.length; length > 0; length--) {
    const office = lookup(OFFICES, key.slice(0, length));
    if (office) return office;
  }
  return { short: code, full: code };
}

/** "Y" or "Small Business Set-Aside" -> "Small Business"; null -> "Not listed". */
export function setAsideLabel(raw: string | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "Not listed";
  const byCode = lookup(SET_ASIDE_CODES, value.toUpperCase());
  if (byCode) return byCode;
  for (const [pattern, label] of SET_ASIDE_PATTERNS) {
    if (pattern.test(value)) return label;
  }
  return value;
}
