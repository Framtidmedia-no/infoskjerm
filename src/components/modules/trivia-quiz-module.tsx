'use client'
import { useState, useEffect } from 'react'

interface Props { fields: Record<string, unknown> }

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export function TriviaQuizModule({ fields }: Props) {
  const question = (fields.question as string) || 'Hva er Norges lengste elv?'
  const answers = [
    { key: 'A', text: (fields.answer_a as string) || 'Glomma' },
    { key: 'B', text: (fields.answer_b as string) || 'Lågen' },
    { key: 'C', text: (fields.answer_c as string) || '' },
    { key: 'D', text: (fields.answer_d as string) || '' },
  ].filter(a => a.text)
  const correct = (fields.correct as string) || 'A'
  const revealAfter = Number(fields.reveal_after) || 15
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), revealAfter * 1000)
    return () => clearTimeout(t)
  }, [revealAfter])

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <span
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Trivia
          </span>
        </div>

        <div>
          <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-10">
            {question}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {answers.map(a => {
              const isCorrect = revealed && a.key === correct
              return (
                <div
                  key={a.key}
                  className="rounded-2xl px-8 py-6 flex items-center gap-6 transition-all duration-300"
                  style={{
                    background: isCorrect
                      ? 'var(--brand-primary, #16a34a)'
                      : 'rgba(255,255,255,0.05)',
                    border: isCorrect
                      ? '1px solid var(--brand-primary, #16a34a)'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    className="text-sm font-bold uppercase tracking-[0.25em] flex-shrink-0"
                    style={{ color: isCorrect ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}
                  >
                    {a.key}
                  </span>
                  <span className="text-2xl font-bold text-white leading-tight">
                    {a.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-base text-white/40 font-medium">
          {revealed
            ? `Riktig svar: ${correct}`
            : `Svaret vises om ${revealAfter} sekunder`}
        </p>
      </div>
    </div>
  )
}
