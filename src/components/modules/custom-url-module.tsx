interface Props { fields: Record<string, unknown> }

export function CustomUrlModule({ fields }: Props) {
  const url = (fields.url as string) || ""
  const title = (fields.title as string) || ""
  const zoom = Number(fields.zoom) || 100

  if (!url) {
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
            Nettside
          </p>
          <div>
            <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-6">
              Ingen URL angitt
            </h1>
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              Legg til en URL i modulinnstillingene for å vise en nettside her.
            </p>
          </div>
          <div />
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
      {title && (
        <div className="px-16 py-4 border-b border-white/10">
          <p
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: "var(--brand-primary, #16a34a)" }}
          >
            {title}
          </p>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full border-0 origin-top-left"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${10000 / zoom}%`,
            height: `${10000 / zoom}%`,
          }}
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        />
      </div>
    </div>
  )
}
