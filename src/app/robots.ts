import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infoskjerm.framtidtech.no"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/login", "/glemt-passord", "/velkommen", "/widget", "/skjerm", "/vis"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
