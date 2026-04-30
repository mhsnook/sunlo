/**
 * Derives a `data-testid` from a TanStack Form field name. snake_case
 * and dotted paths become kebab-case, with `-input` appended:
 *   "username"          -> "username-input"
 *   "playlist_title"    -> "playlist-title-input"
 *   "languages_known.0" -> "languages-known-0-input"
 */
export const toTestId = (name: string) => `${name.replace(/[._]/g, '-')}-input`
