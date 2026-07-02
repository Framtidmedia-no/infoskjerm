/**
 * Flate-modell for innhold: kunde-skjermer vs interne skjermer. «begge» er en
 * lagret verdi (body.audience) som betyr at elementet vises på BEGGE flater —
 * brukes av fullskjerm-media. Ren modul (ingen server-avhengigheter) så både
 * widgets (service-role), admin-lister og klientkomponenter deler samme logikk.
 */

/** En skjermflate (overflaten innholdet vises på). */
export type Audience = "kunde" | "intern"

/** Lagret på body.audience — «begge» = vis på begge flater. */
export type StoredAudience = Audience | "begge"

/** Standard flate for en innholdstype når ikke eksplisitt satt (tilbud → kunde). */
export function audienceForType(type: string): Audience {
  return type === "slide" ? "kunde" : "intern"
}

/** Normaliserer body.audience → lagret flate (faller tilbake til type-standard). */
export function storedAudienceOf(type: string, bodyAudience: unknown): StoredAudience {
  return bodyAudience === "kunde" || bodyAudience === "intern" || bodyAudience === "begge"
    ? bodyAudience
    : audienceForType(type)
}

/** True når innhold med lagret flate hører hjemme på gitt skjermflate. */
export function audienceMatches(stored: StoredAudience, surface: Audience): boolean {
  return stored === "begge" || stored === surface
}
