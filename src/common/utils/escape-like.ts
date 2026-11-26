/** Escapes MySQL LIKE wildcard characters (`\`, `%`, `_`) in user search text. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
