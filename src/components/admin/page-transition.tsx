"use client"
import { motion } from "framer-motion"

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      // *:min-w-0: sidene er kolonne-flex-items — uten guard får de content-basert
      // min-bredde og brede tabeller presser siden bredere enn viewporten.
      className="flex flex-col flex-1 *:min-w-0"
    >
      {children}
    </motion.div>
  )
}
