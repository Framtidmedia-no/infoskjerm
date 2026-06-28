import { useEffect, useRef } from 'react'
import type { ModulePlacement } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

type Supabase = SupabaseClient<Database>

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosave(
  supabase: Supabase,
  name: string,
  placements: ModulePlacement[],
  tenantId: string,
  userId: string,
  contentItemId: string | null,
  onSaved: (id: string) => void,
  onStatus: (status: SaveStatus) => void,
  delayMs = 30_000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      onStatus('saving')
      try {
        const body = JSON.parse(JSON.stringify({ builder_v1: { placements } })) as Json
        if (contentItemId) {
          await supabase
            .from('content_items')
            .update({ title: name, body, updated_at: new Date().toISOString() })
            .eq('id', contentItemId)
        } else {
          const { data } = await supabase
            .from('content_items')
            .insert({
              title: name,
              body,
              type: 'slide',
              status: 'draft',
              tenant_id: tenantId,
              created_by: userId,
            })
            .select('id')
            .single()
          if (data) onSaved(data.id)
        }
        onStatus('saved')
      } catch {
        onStatus('error')
      }
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [name, placements, supabase, tenantId, userId, contentItemId, onSaved, onStatus, delayMs])
}
