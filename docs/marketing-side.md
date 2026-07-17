# Offentlig produktside (/)

Den offentlige salgs-/produktsiden for Infoskjerm. Rot-URL viser nå marketing i
stedet for å redirecte til `/admin` (fjernet både i `src/app/page.tsx` og
`next.config.ts`-redirects).

## Arkitektur

- **Side:** `src/app/(marketing)/page.tsx` (+ `layout.tsx` som scoper fonter og
  `.mk`-klassen). Revalideres hvert 5. minutt (`revalidate = 300`).
- **Innhold:** `marketing_blocks` + `marketing_prices` i Supabase (migrasjon
  `20260717190000_marketing_public_site.sql`). Offentlig SELECT via RLS;
  skriving kun via service-role i super_admin-gatede server actions.
- **Admin-CRUD:** `/admin/plattform/nettside` (kun super_admin) — tekstblokker,
  ticker, SEO og full CRUD på prisrader.
- **Design:** Hallmark-tema «Carnival» (drop Cold Snap), makrostruktur Marquee
  Hero. All CSS er klasse-scopet under `.mk` i `globals.css` og berører ikke
  admin-, auth- eller widget-flatene. Designvalg logges i `.hallmark/log.json`.

## Priser (seed pr. 2026-07-17)

| Produkt | Periode | Antall | Pris |
| --- | --- | --- | --- |
| Infoskjerm | Månedlig | 1–4 skjermer | 249 kr per skjerm |
| Infoskjerm | Månedlig | 5–19 skjermer | 199 kr per skjerm |
| Infoskjerm | Månedlig | 20+ skjermer | 179 kr per skjerm |
| Infoskjerm 4G-tillegg | Månedlig | alle | 249 kr per skjerm |
| Infoskjerm-oppsett og hardware | Engang | alle | 2 990 kr per skjerm |

Skjermpaneler kjøpes av kunden (vi anbefaler kommersielle 16/7- eller
24/7-skjermer). Prisene redigeres i admin — tabellen over er kun et øyeblikks-
bilde av seed-verdiene.

## Known non-CMS (bevisst hardkodet)

- Nav-etikettene («Slik virker det», «Priser», «Logg inn») og seksjonstittelen
  «Slik virker det» — systemtekst knyttet til ankerlenkene.
- Footer-metalinjen: «Utviklet av Framtid Tech AS» + lenker + © — juridisk/
  brand-krav, skal ikke kunne fjernes fra CMS.
- Ornamenter (◆ ✱ ❋), fallback-tekster («Ta kontakt», «Priser») og
  stage-numereringen (1.0–4.0 genereres av rekkefølgen).
- OG-bilde finnes ikke ennå (kun tittel/beskrivelse) — mulig oppfølging.

## Runde 2 (2026-07-17): juridisk + konvertering

- **/personvern + /vilkar**: CMS-drevne (kind `page`, slug i extra), markdown-lite
  rendering. **Vilkårene er et utkast — Frank må godkjenne det juridiske innholdet.**
- **Kontaktskjema** på forsiden (#kontakt): Turnstile + volumsperre (20/t) →
  `marketing_leads` (RLS uten policies = kun service-role) + Resend-varsel til
  `cta.extra.lead_recipient` (CMS-styrt, default hei@framtidtech.no).
- **SEO**: robots.ts, sitemap.ts, JSON-LD (Organization + Service + Offers fra DB),
  statisk OG-bilde (Carnival-plakat).
- **Analytics**: Vercel Web Analytics (cookieless) kun på marketing-flaten —
  aktiveres i Vercel-dashboardet (Project → Analytics) ved første deploy.
- **Cookies**: ingen samtykkebanner nødvendig (ingen analyse-/markedsføringscookies).
  Cookiebot kobles KUN på hvis GA4/pixel legges til senere (uc.js via useEffect!).
- Footer: org.nr 837 596 092 + Personvern/Vilkår-lenker. Login har «← Til forsiden».
