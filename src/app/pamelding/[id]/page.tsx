import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { htmlToBlocks } from "@/lib/content/live"
import { SignupForm } from "./signup-form"
import { CalendarDays, MapPin, Clock } from "lucide-react"
import { displayFont } from "@/lib/fonts"

/**
 * Public, festive event landing page reached by scanning the QR on an internal
 * screen. Shows the invitation (title, date, place, image, details) and a
 * built-in sign-up form that writes to event_signups. Branded in the chain's
 * colour when a ?store=<id> is supplied (the screen passes it on the QR).
 *
 * Usage: /pamelding/<contentItemId>?store=<storeId>
 */

export const dynamic = "force-dynamic"

const GOLD = "#f5c451"

/** Svevende festemojier i heroen — posisjon/tempo varierer per emoji. */
const HERO_EMOJIS: Array<{ emoji: string; left: string; top: string; size: string; duration: string; delay: string }> = [
  { emoji: "🎈", left: "8%", top: "12%", size: "1.9rem", duration: "5.5s", delay: "0s" },
  { emoji: "🎊", left: "82%", top: "9%", size: "1.6rem", duration: "6.5s", delay: "0.8s" },
  { emoji: "✨", left: "68%", top: "30%", size: "1.3rem", duration: "4.8s", delay: "0.3s" },
  { emoji: "🥂", left: "88%", top: "48%", size: "1.7rem", duration: "7s", delay: "1.4s" },
  { emoji: "🎉", left: "4%", top: "42%", size: "1.4rem", duration: "6s", delay: "0.6s" },
]

interface ChainRow { name: string; color: string; logo_url: string | null }
interface InvBody {
  html?: string
  imageUrl?: string | null
  invitation?: { eventDate?: string | null; eventPlace?: string | null; signupEnabled?: boolean; signupDeadline?: string | null }
}

function formatEventDate(iso: string | null | undefined): { date: string; time: string | null } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hasTime = /T\d\d:\d\d/.test(iso)
  const date = d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return {
    date: date.charAt(0).toUpperCase() + date.slice(1),
    time: hasTime ? d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : null,
  }
}

/**
 * Lesbar tekstfarge oppå kjedens accent — lyse farger (gull/amber) trenger
 * mørk tekst for å møte kontrastkrav, mørke (SPAR-grønn, EUROSPAR-rød) hvit.
 */
function readableOn(hex: string): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return "#ffffff"
  const n = parseInt(m[1], 16)
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
  return lum > 150 ? "#231a04" : "#ffffff"
}

function deadlinePassed(iso: string | null | undefined): boolean {
  if (!iso) return false
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return false
  end.setHours(23, 59, 59, 999)
  return Date.now() > end.getTime()
}

/** Perforert «riv av»-linje med hullene som gjør kortet til en billett. */
function TicketPerforation() {
  return (
    <div aria-hidden className="relative px-7">
      <div className="border-t-2 border-dashed border-zinc-200" />
      <span className="absolute -left-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-zinc-50" />
      <span className="absolute -right-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-zinc-50" />
    </div>
  )
}

export default async function PameldingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ store?: string }>
}) {
  const { id } = await params
  const { store } = await searchParams
  const supabase = createAdminClient()

  // The CMS live-preview points its QR here with a placeholder id, so scanning
  // it shows a friendly sample page instead of a 404.
  const isPreview = id === "forhandsvisning"

  const { data: dbItem } = isPreview
    ? { data: null }
    : await supabase.from("content_items").select("id, title, type, status, body").eq("id", id).maybeSingle()
  if (!isPreview && (!dbItem || dbItem.type !== "invitation")) notFound()

  const item = dbItem ?? {
    id: "forhandsvisning",
    title: "Slik ser påmeldingssiden ut",
    type: "invitation" as const,
    status: "live" as const,
    body: {
      html: "<p>Dette er en forhåndsvisning. Når du publiserer invitasjonen og noen skanner QR-koden på skjermen, kommer de hit og kan melde seg på.</p>",
      invitation: { eventDate: null, eventPlace: null, signupEnabled: true, signupDeadline: null },
    } as InvBody,
  }

  const body = (item.body ?? {}) as InvBody
  const inv = body.invitation ?? {}
  const blocks = htmlToBlocks(body.html ?? "")
  const when = formatEventDate(inv.eventDate)
  const image = body.imageUrl ?? null

  // Optional chain branding from the store the screen belongs to.
  const { data: storeRow } = store
    ? await supabase.from("stores").select("id, name, chains(name, color, logo_url)").eq("id", store).maybeSingle()
    : { data: null }
  const chain = storeRow?.chains as unknown as ChainRow | null
  const accent = chain?.color || GOLD
  const accentFg = readableOn(accent)
  const heroBg = "linear-gradient(160deg,#150f30 0%,#3b1d63 52%,#8a3068 100%)"

  const signupOpen = item.status === "live" && inv.signupEnabled !== false && !deadlinePassed(inv.signupDeadline)
  const closedReason =
    item.status !== "live" || inv.signupEnabled === false
      ? "Påmeldingen er ikke åpen."
      : deadlinePassed(inv.signupDeadline)
        ? "Påmeldingsfristen har gått ut."
        : null

  const deadlineText = inv.signupDeadline
    ? new Date(inv.signupDeadline).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
    : null

  const infoRows = [
    when && { icon: CalendarDays, text: when.date },
    when?.time && { icon: Clock, text: `kl. ${when.time}` },
    inv.eventPlace && { icon: MapPin, text: inv.eventPlace },
  ].filter(Boolean) as Array<{ icon: typeof CalendarDays; text: string }>

  const hasTicket = Boolean(image || infoRows.length > 0 || blocks.length > 0)

  return (
    <main className={`${displayFont.variable} min-h-screen bg-zinc-50`}>
      {/* Festive hero */}
      <section className="relative overflow-hidden px-6 pt-12 pb-32 text-white" style={{ background: heroBg }}>
        <div aria-hidden className="absolute -top-24 -right-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,196,81,.25), transparent 70%)" }} />
        <div aria-hidden className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,.07), transparent 70%)" }} />
        <div aria-hidden className="fx-grain absolute inset-0 opacity-[0.06]" />
        {HERO_EMOJIS.map((e) => (
          <span
            key={e.emoji}
            aria-hidden
            className="fx-float absolute opacity-80"
            style={{ left: e.left, top: e.top, fontSize: e.size, animationDuration: e.duration, animationDelay: e.delay }}
          >
            {e.emoji}
          </span>
        ))}
        <div className="relative mx-auto max-w-md">
          {chain?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chain.logo_url} alt={chain.name ?? ""} className="fx-rise mb-6 h-10 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : null}
          <div className="fx-rise inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] shadow-lg" style={{ background: GOLD, color: "#1a1333" }}>
            🎉 Invitasjon
          </div>
          <h1 className="font-display fx-rise mt-4 text-balance text-4xl font-black leading-[1.05] sm:text-5xl" style={{ animationDelay: "80ms", textShadow: "0 2px 24px rgba(0,0,0,.35)" }}>
            {item.title}
          </h1>
        </div>
      </section>

      <div className="relative mx-auto -mt-24 max-w-md px-6 pb-16">
        {/* Billetten: bilde + tid/sted, perforering, detaljer */}
        {hasTicket && (
          <div className="fx-rise overflow-hidden rounded-3xl bg-white shadow-xl" style={{ animationDelay: "140ms" }}>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-48 w-full object-cover" />
            )}
            {infoRows.length > 0 && (
              <div className="space-y-3 p-7 pb-6">
                {infoRows.map(({ icon: Icon, text }) => (
                  <p key={text} className="flex items-center gap-3.5 font-medium text-zinc-800">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1f` }}>
                      <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
                    </span>
                    {text}
                  </p>
                ))}
              </div>
            )}
            {infoRows.length > 0 && blocks.length > 0 && <TicketPerforation />}
            {blocks.length > 0 && (
              <div className={infoRows.length > 0 ? "p-7 pt-6" : "p-7"}>
                {blocks.map((b, i) =>
                  b.kind === "h" ? (
                    <p key={i} className="font-display mb-1 mt-3 text-lg font-bold text-zinc-900 first:mt-0">{b.text}</p>
                  ) : b.kind === "li" ? (
                    <p key={i} className="flex gap-2 leading-relaxed text-zinc-600"><span style={{ color: accent }}>•</span>{b.text}</p>
                  ) : (
                    <p key={i} className="mb-2 leading-relaxed text-zinc-600 last:mb-0">{b.text}</p>
                  )
                )}
              </div>
            )}
          </div>
        )}

        <div className="fx-rise mt-6" style={{ animationDelay: "220ms" }}>
          {signupOpen ? (
            <SignupForm contentItemId={item.id} storeId={store ?? null} accent={accent} accentFg={accentFg} deadlineText={deadlineText} />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
              <h2 className="font-display text-xl font-extrabold text-zinc-900">Påmelding stengt</h2>
              <p className="mt-2 text-zinc-500">{closedReason}</p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Opplysningene brukes kun til å administrere arrangementet, og slettes etterpå.
        </p>
      </div>
    </main>
  )
}
