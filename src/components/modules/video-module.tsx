"use client"

interface Props { fields: Record<string, unknown> }

export function VideoModule({ fields }: Props) {
  const title = (fields.title as string) || ""
  const videoUrl = (fields.video_url as string) || ""
  const label = (fields.label as string) || ""

  const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")

  const embedUrl = (() => {
    if (!isYoutube) return videoUrl
    try {
      const url = new URL(videoUrl)
      const videoId = url.hostname.includes("youtu.be")
        ? url.pathname.slice(1)
        : url.searchParams.get("v") ?? ""
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&disablekb=1&modestbranding=1`
    } catch {
      return videoUrl
    }
  })()

  if (!videoUrl) {
    return (
      <div
        className="flex flex-col h-full text-white"
        style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)" }}
      >
        <div className="h-2 w-full" style={{ backgroundColor: "var(--brand-primary, #16a34a)" }} />
        <div className="flex flex-col justify-between flex-1 px-16 py-12">
          <p
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: "var(--brand-primary, #16a34a)" }}
          >
            Video
          </p>
          <div>
            <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-6">
              Ingen video angitt
            </h1>
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              Legg til en video-URL i modulinnstillingene.
            </p>
          </div>
          <div />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-full text-white overflow-hidden bg-black">
      {isYoutube ? (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen"
        />
      ) : (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {(title || label) && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-16 py-12">
          {label && (
            <p
              className="text-sm font-bold uppercase tracking-[0.25em] mb-4"
              style={{ color: "var(--brand-primary, #16a34a)" }}
            >
              {label}
            </p>
          )}
          {title && (
            <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">{title}</h1>
          )}
        </div>
      )}
    </div>
  )
}
