export interface BoardTag {
  id: string
  name: string
  color: string
}

export interface BoardStore {
  id: string
  name: string
  company_name: string | null
  city: string | null
  email: string | null
  org_number: string | null
  gln: string | null
  screenCount: number
  tags: BoardTag[]
}

export interface BoardChain {
  id: string
  name: string
  color: string
  stores: BoardStore[]
}

/** Append a 2-hex-digit alpha channel to a #rrggbb color. */
export function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`
}
