import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infoskjerm.framtidtech.no"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/personvern`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/vilkar`, changeFrequency: "yearly", priority: 0.3 },
  ]
}
