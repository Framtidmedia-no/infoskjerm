interface Props { fields: Record<string, unknown> }

const CATEGORY_COLORS: Record<string, string> = {
  HMS: "#10b981",
  Kundeservice: "#8b5cf6",
  Produktkunnskap: "#f59e0b",
  Rutiner: "#3b82f6",
}

const DEFAULT_COLOR = "#6366f1"

export function TrainingMaterialModule({ fields }: Props) {
  const title = (fields.title as string) || "Opplæring"
  const body = (fields.body as string) || ""
  const category = (fields.category as string) || "Rutiner"
  const instructor = (fields.instructor as string) || ""
  const source = (fields.source as string) || ""
  const imageUrl = (fields.image_url as string) || null

  const accentColor = CATEGORY_COLORS[category] ?? DEFAULT_COLOR
  const footerText = instructor || source || null

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)" }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: accentColor }} />
      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p
          className="text-sm font-bold uppercase tracking-[0.25em]"
          style={{ color: accentColor }}
        >
          {category}
        </p>

        <div className="flex gap-16 items-center">
          <div className="flex-1">
            <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-8">
              {title}
            </h1>
            {body && (
              <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
                {body}
              </p>
            )}
          </div>

          {imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={title}
                className="w-80 h-64 rounded-2xl object-cover"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
          )}
        </div>

        {footerText ? (
          <p className="text-base text-white/40 font-medium">{footerText}</p>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
