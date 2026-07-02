/**
 * Re-eksport av flate-logikken som nå bor i @/lib/content/audience, så både
 * widgets (lib) og admin (app) deler samme «kunde/intern/begge»-regler uten at
 * lib trenger å importere fra app-laget.
 */
export {
  audienceForType,
  storedAudienceOf,
  audienceMatches,
  type Audience,
  type StoredAudience,
} from "@/lib/content/audience"
