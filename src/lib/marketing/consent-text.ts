/**
 * Samtykketeksten kunden godkjenner. Holdes ett sted så både visning og den
 * loggede signaturen (signed_scope) bruker nøyaktig samme ordlyd.
 */
export const CONSENT_INTRO =
  "Framtid Tech AS ber om ditt samtykke til å bruke virksomheten din som referanse i markedsføringen av Infoskjerm."

export const CONSENT_POINTS = [
  "Vi kan vise virksomhetens navn og logo på den offentlige produktsiden infoskjerm.framtidtech.no og i tilhørende markedsføring.",
  "Vi kan gjengi sitatet og navnet/rollen til kontaktpersonen slik det vises i forhåndsvisningen på denne siden.",
  "Vi kan vise et skjermbilde fra deres infoskjerm, dersom et slikt er lagt ved forhåndsvisningen.",
  "Samtykket er frivillig og kan når som helst trekkes tilbake ved å sende en e-post til hei@framtidtech.no — da fjerner vi referansen uten ugrunnet opphold.",
  "Vi bruker kun det som vises i forhåndsvisningen. Nytt innhold krever nytt samtykke.",
]

export const CONSENT_FOOTER =
  "Ved å signere bekrefter du at du har fullmakt til å gi dette samtykket på vegne av virksomheten. Signaturen logges med tidspunkt for dokumentasjon (jf. personvernerklæringen)."

/** Samlet tekst som snapshottes i signaturloggen (signed_scope). */
export function consentScopeSnapshot(): string {
  return [CONSENT_INTRO, ...CONSENT_POINTS.map((p) => `- ${p}`), CONSENT_FOOTER].join("\n")
}
