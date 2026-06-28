"use client"

import { useEffect } from "react"

interface ChainThemeProviderProps {
  chainKey: string
  children: React.ReactNode
}

export function ChainThemeProvider({ chainKey, children }: ChainThemeProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute("data-chain", chainKey)
    return () => {
      document.documentElement.removeAttribute("data-chain")
    }
  }, [chainKey])

  return <>{children}</>
}
