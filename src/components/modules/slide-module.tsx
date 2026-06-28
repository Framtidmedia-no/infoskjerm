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
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (imageList.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % imageList.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [imageList.length])

  if (imageList.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        Ingen bilder lagt til
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {imageList.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={title || ""}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-12 z-10">
          <h2 className="text-4xl font-black text-white">{title}</h2>
        </div>
      )}
    </div>
  )
}
