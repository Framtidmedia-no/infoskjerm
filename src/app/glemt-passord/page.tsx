"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Loader2, MailCheck } from "lucide-react"
import { requestPasswordReset } from "./actions"

export default function GlemtPassordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    await requestPasswordReset(email.trim())
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/framtid-tech-logo-dark.png"
              alt="Framtid Tech"
              width={180}
              height={48}
              priority
              className="h-10 w-auto"
            />
          </div>
          <p className="text-zinc-500 text-sm mt-1">Infoskjerm Admin</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">Sjekk e-posten</h2>
              <p className="text-zinc-500 text-sm">
                Finnes det en konto på <span className="text-zinc-300">{email}</span>, har vi sendt en lenke for å velge nytt passord.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Glemt passord?</h2>
              <p className="text-zinc-500 text-sm mb-6">Skriv inn e-posten din, så sender vi en lenke.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@epost.no"
                    required
                    autoFocus
                    className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Sender..." : "Send lenke"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Tilbake til innlogging
          </Link>
        </div>
      </div>
    </div>
  )
}
