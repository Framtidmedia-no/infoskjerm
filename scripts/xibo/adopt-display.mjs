/**
 * Adopterer en nyregistrert Pi i Xibo: autoriserer displayet og legger det i
 * riktig skjermgruppe. Brukes etter flashing med golden image (firstboot gir
 * Pi-en ny display-identitet, så den dukker opp som uautorisert display med
 * hostnavnet som navn).
 *
 *   node scripts/xibo/adopt-display.mjs gr-spar-valderoya1 --group "SPAR Valderøya"
 *
 * Gruppen opprettes hvis den ikke finnes (konvensjon: kunde = butikknavnet,
 * bakrom = «{butikk} – Bakrom»). Kjøres fra repo-rot (leser .env.local).
 */
import { loadEnv, getToken, makeApi } from "./lib.mjs"

const args = process.argv.slice(2)
const displayName = args[0]
const groupIdx = args.indexOf("--group")
const groupName = groupIdx >= 0 ? args[groupIdx + 1] : null

if (!displayName || !groupName) {
  console.error('Bruk: node scripts/xibo/adopt-display.mjs <hostnavn> --group "GRUPPENAVN"')
  process.exit(1)
}

const env = loadEnv()
const api = makeApi(env, await getToken(env))

const displays = (await api(`/display?display=${encodeURIComponent(displayName)}&length=50`)) || []
const display = displays.find((d) => d.display === displayName)
if (!display) {
  console.error(`Fant ikke display «${displayName}» i Xibo. Har Pi-en bootet ferdig og nådd CMS-et?`)
  if (displays.length) console.error(`Nesten-treff: ${displays.map((d) => d.display).join(", ")}`)
  process.exit(1)
}
console.log(`Display ${display.displayId} «${display.display}» — lisensiert: ${display.licensed ? "ja" : "nei"}`)

if (!display.licensed) {
  await api(`/display/authorise/${display.displayId}`, { method: "PUT" })
  console.log("✅ Autorisert.")
} else {
  console.log("Allerede autorisert — hopper over.")
}

const groups = (await api(`/displaygroup?length=500&isDisplaySpecific=0`)) || []
let group = groups.find((g) => g.displayGroup === groupName)
if (!group) {
  group = await api(`/displaygroup`, {
    method: "POST",
    form: { displayGroup: groupName, description: "Opprettet av adopt-display", isDynamic: 0 },
  })
  console.log(`Opprettet skjermgruppe «${groupName}» (${group.displayGroupId}).`)
}

await api(`/displaygroup/${group.displayGroupId}/display/assign`, {
  method: "POST",
  form: { "displayId[]": display.displayId },
})
console.log(`✅ «${display.display}» ligger nå i gruppen «${groupName}».`)
console.log("Neste: koble layout til gruppen om nødvendig (scripts/xibo/build-widget-layout.mjs).")
