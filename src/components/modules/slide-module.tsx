"use client"

import { useEffect, useState } from "react"

interface Props { fields: Record<string, unknown> }

export function SlideModule({ fields }: Props) {
  const raw = fields.images as string | null
  const imageList: string[] = (() => {
    try {
      return typeof raw === "string" ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })()

  const title = (fields.title as string) || null
  const body = (fields.body as string) || null
  const label = (fields.label as string) || null
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (imageList.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % imageList.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [imageList.length])

  const currentImage = imageList[current] ?? null

  if (currentImage) {
    return (
      <div
        className="relative flex flex-col h-full text-white overflow-hidden"
        style={{
          backgroundImage: `url(${currentImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="h-2 w-full relative z-10" style={{ backgroundColor: "var(--brand-primary, #16a34a)" }} />
        <div className="flex flex-col justify-between flex-1 px-16 py-12 relative z-10">
          <div>
            {label && (
              <p
                className="text-sm font-bold uppercase tracking-[0.25em] mb-6"
                style={{ color: "var(--brand-primary, #16a34a)" }}
              >
                {label}
              </p>
            )}
          </div>
          <div>
            {title && (
              <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-6">{title}</h1>
            )}
            {body && (
              <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">{body}</p>
            )}
          </div>
          {imageList.length > 1 && (
            <div className="flex gap-2 mt-8">
              {imageList.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${i === current ? "w-8 bg-white" : "w-2 bg-white/30"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)" }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: "var(--brand-primary, #16a34a)" }} />
      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          {label && (
            <p
              className="text-sm font-bold uppercase tracking-[0.25em]"
              style={{ color: "var(--brand-primary, #16a34a)" }}
            >
              {label}
            </p>
          )}
        </div>
        <div>
          {title ? (
            <>
              <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-6">{title}</h1>
              {body && <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">{body}</p>}
            </>
          ) : (
            <p className="text-2xl text-white/40">Ingen bilder lagt til</p>
          )}
        </div>
        <div />
      </div>
    </div>
  )
}
