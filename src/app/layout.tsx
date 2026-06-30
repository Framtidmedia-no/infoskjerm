import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Framtid Tech Infoskjerm",
  description: "Administrasjon av infoskjermer — Framtid Tech",
  manifest: "/manifest.webmanifest",
  applicationName: "Infoskjerm",
  appleWebApp: {
    capable: true,
    title: "Infoskjerm",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
