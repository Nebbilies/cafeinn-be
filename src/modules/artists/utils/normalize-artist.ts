/** Normalizes artist email for case-insensitive uniqueness checks. */
export function normalizeArtistEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Normalizes optional text fields so blank strings store as null. */
export function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
