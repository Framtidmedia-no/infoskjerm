const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

/** Standard feilmelding for avvist/utløpt sikkerhetssjekk, delt av alle skjemaer. */
export const TURNSTILE_ERROR_MESSAGE = "Sikkerhetssjekken feilet. Last siden på nytt og prøv igjen."

/**
 * Verifiserer et Turnstile-token mot Cloudflare siteverify. Fail-closed:
 * manglende token/secret, nettverksfeil eller ikke-success gir avslag.
 * Tokens er engangs — klienten må hente nytt token per innsendingsforsøk.
 */
export async function verifyTurnstileToken(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY mangler — avviser sikkerhetssjekk")
    return false
  }
  if (!token) return false

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] }
    if (data.success !== true) {
      console.error("Turnstile siteverify avslo token:", data["error-codes"] ?? [])
      return false
    }
    return true
  } catch (error: unknown) {
    console.error("Turnstile siteverify utilgjengelig:", error)
    return false
  }
}
