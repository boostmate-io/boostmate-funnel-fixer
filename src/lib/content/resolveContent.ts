// =============================================================================
// Editable Product Content — shared resolver.
//
// This is the delivery half of the "Editable Product Content" pattern described
// in ./README.md. Every domain content table (growth_stages, growth_systems,
// and future ones) stores its default copy in real typed columns and any other
// locale under a single `translations` JSONB column shaped:
//
//   { "nl": { "<column>": "..." }, "de": { ... } }
//
// `resolveContent` merges the requested locale over the base row so callers can
// read plain fields without worrying about locale fallbacks.
// =============================================================================

/** Shape every editable content row must satisfy. */
export interface LocalizedContentRow {
  translations?: Record<string, Record<string, unknown>> | null;
}

/**
 * Normalise an i18next language tag ("nl-BE", "NL") to its base locale ("nl").
 */
export function baseLocale(lang: string | undefined | null): string {
  return (lang ?? "en").split("-")[0].toLowerCase();
}

/**
 * Merge the translation overlay for `lang` over the base row.
 *
 * - Missing locale -> base row is returned unchanged.
 * - Missing or empty individual fields -> base value is kept (never a blank UI).
 * - `translations` itself is stripped from the result.
 */
export function resolveContent<T extends LocalizedContentRow>(
  row: T,
  lang: string | undefined | null,
): Omit<T, "translations"> {
  const { translations, ...base } = row as T & { translations?: unknown };
  const locale = baseLocale(lang);

  const overlay =
    locale === "en" || !translations
      ? undefined
      : (translations as Record<string, Record<string, unknown>>)[locale];

  if (!overlay) return base as Omit<T, "translations">;

  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (typeof value === "string" ? value.trim() !== "" : value != null) {
      merged[key] = value;
    }
  }
  return merged as Omit<T, "translations">;
}

/** Resolve a whole list in one call. */
export function resolveContentList<T extends LocalizedContentRow>(
  rows: T[],
  lang: string | undefined | null,
): Array<Omit<T, "translations">> {
  return rows.map((r) => resolveContent(r, lang));
}

/**
 * Read a single localized field off a raw row without resolving the whole
 * object — handy inside admin previews.
 */
export function localizedField<T extends LocalizedContentRow>(
  row: T,
  field: keyof T & string,
  lang: string | undefined | null,
): string {
  const resolved = resolveContent(row, lang) as Record<string, unknown>;
  const value = resolved[field];
  return typeof value === "string" ? value : "";
}

/**
 * Shared cache policy for editable product content. Content changes rarely and
 * is admin-authored, so a long stale time keeps it to one fetch per session.
 */
export const CONTENT_QUERY_OPTIONS = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;
