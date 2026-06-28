interface Props { fields: Record<string, unknown> }

export function SustainabilityInfoModule({ fields }: Props) {
  const title = (fields.title as string) || "Bærekraft"
  const metric = (fields.metric as string) || ""
  const metricLabel = (fields.metric_label as string) || ""
  const description = (fields.description as string) || ""
  const goal = (fields.goal as string) || ""
  const imageUrl = (fields.image_url as string) || null

  const GREEN = "#22c55e"

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #0d1a0d 100%)" }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: GREEN }} />
      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p
          className="text-sm font-bold uppercase tracking-[0.25em]"
          style={{ color: GREEN }}
        >
          Bærekraft
        </p>

        <div className="flex gap-16 items-end">
          <div className="flex-1">
            {metric && (
              <div className="mb-8">
                <span
                  className="text-[9rem] font-black leading-none"
                  style={{ color: GREEN }}
                >
                  {metric}
                </span>
                {metricLabel && (
                  <p className="text-2xl text-white/70 leading-relaxed mt-3 max-w-3xl">
                    {metricLabel}
                  </p>
                )}
              </div>
            )}

            <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-6">
              {title}
            </h1>

            {description && (
              <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
                {description}
              </p>
            )}

            {goal && (
              <div
                className="mt-8 border-l-4 pl-6 py-2"
                style={{ borderColor: GREEN }}
              >
                <p className="text-base text-white/40 font-medium uppercase tracking-[0.15em] mb-2">
                  Mål
                </p>
                <p className="text-2xl font-semibold" style={{ color: GREEN }}>
                  {goal}
                </p>
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={title}
                className="w-80 h-80 rounded-2xl object-cover"
                style={{ border: `1px solid ${GREEN}33` }}
              />
            </div>
          )}
        </div>

        <div />
      </div>
    </div>
  )
}
