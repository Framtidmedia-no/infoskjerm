import Image from "next/image"
import { displayFont } from "@/lib/fonts"

export interface AuthBrand {
  name: string
  logoUrl: string | null
}

/**
 * Felles ramme for de mørke auth-sidene (/login, /glemt-passord, /velkommen):
 * nordisk nattehimmel med stjernefelt, nordlys-glød og glass-kort.
 * Ren presentasjon — sidene eier all logikk selv. Med `brand` vises tenantens
 * logo/navn i headeren (enhets-husket branding) i stedet for Framtid Tech.
 */
export function AuthShell({
  children,
  below,
  brand,
}: {
  children: React.ReactNode
  below?: React.ReactNode
  brand?: AuthBrand | null
}) {
  return (
    <div
      className={`${displayFont.variable} auth-dark relative flex min-h-screen items-center justify-center overflow-hidden p-4`}
      style={{ background: "linear-gradient(180deg, #05070d 0%, #0a0e18 55%, #0d1220 100%)" }}
    >
      {/* Nattehimmel: stjerner i to lag + nordlys + horisontglød + korn */}
      <div aria-hidden className="fx-stars absolute inset-0 opacity-60" />
      <div aria-hidden className="fx-stars-2 fx-twinkle absolute inset-0" />
      <div
        aria-hidden
        className="fx-drift absolute -top-48 left-1/2 h-[26rem] w-[56rem] -translate-x-[60%]"
        style={{
          background: "radial-gradient(closest-side, rgba(16,185,129,0.16), transparent 70%)",
          filter: "blur(48px)",
        }}
      />
      <div
        aria-hidden
        className="fx-drift-slow absolute -top-32 left-1/2 h-[22rem] w-[44rem] -translate-x-[20%]"
        style={{
          background: "radial-gradient(closest-side, rgba(56,189,248,0.10), transparent 70%)",
          filter: "blur(56px)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-56 w-[120%] -translate-x-1/2"
        style={{ background: "radial-gradient(ellipse at bottom, rgba(16,185,129,0.07), transparent 65%)" }}
      />
      <div aria-hidden className="fx-grain absolute inset-0 opacity-[0.05]" />

      <div className="relative w-full max-w-sm">
        {/* Logo + produktlinje */}
        <div className="fx-rise mb-8 text-center">
          {brand ? (
            <div className="mb-4 flex flex-col items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-[0_12px_36px_-12px_rgba(0,0,0,0.8)]">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="font-display text-2xl font-bold text-zinc-900">{brand.name.charAt(0)}</span>
                )}
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-white">{brand.name}</span>
            </div>
          ) : (
            <div className="mb-4 flex justify-center">
              <Image
                src="/framtid-tech-logo-dark.png"
                alt="Framtid Tech"
                width={180}
                height={48}
                priority
                className="h-10 w-auto"
              />
            </div>
          )}
          <p className="flex items-center justify-center gap-2 text-sm tracking-wide text-zinc-400">
            <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 text-emerald-400">
              <path fill="currentColor" d="M8 0c.6 4.2 3.8 7.4 8 8-4.2.6-7.4 3.8-8 8-.6-4.2-3.8-7.4-8-8 4.2-.6 7.4-3.8 8-8Z" />
            </svg>
            Infoskjerm Admin
          </p>
        </div>

        {/* Glass-kort med gradient-kant og topplys */}
        <div className="fx-rise rounded-3xl bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.03] p-px shadow-[0_32px_90px_-28px_rgba(0,0,0,0.9)]" style={{ animationDelay: "90ms" }}>
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#0c111c]/90 p-8 backdrop-blur-xl">
            <div
              aria-hidden
              className="absolute inset-x-8 top-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)" }}
            />
            {children}
          </div>
        </div>

        {below ? (
          <div className="fx-rise" style={{ animationDelay: "180ms" }}>
            {below}
          </div>
        ) : null}
      </div>
    </div>
  )
}
