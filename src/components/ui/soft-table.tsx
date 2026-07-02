import { cn } from "@/lib/utils"

/**
 * «Pillekort»-tabell: hver rad er sitt eget avrundede, flytende kort med luft
 * mellom radene, og headeren er dempede mikro-etiketter i stedet for en mørk
 * stripe. Bygger på ekte <table> med border-separate så kolonnejustering og
 * semantikk beholdes — radkort-stylingen ligger på <SoftTr>, cellene trenger
 * bare padding.
 */

export function SoftTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto contain-inline-size px-1 pb-1">
      <table className={cn("w-full border-separate border-spacing-y-2 text-sm", className)}>{children}</table>
    </div>
  )
}

export function SoftThead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="text-left">{children}</tr>
    </thead>
  )
}

export function SoftTh({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-4 pb-0 pt-1 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500 first:pl-5 last:pr-5",
        className
      )}
    >
      {children}
    </th>
  )
}

export function SoftTr({ className, children, index, onClick }: { className?: string; children: React.ReactNode; index?: number; onClick?: React.MouseEventHandler<HTMLTableRowElement> }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "group",
        "[&>td]:border-y [&>td]:border-zinc-200/70 [&>td]:bg-white [&>td]:transition-colors",
        "[&>td:first-child]:rounded-l-2xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-2xl [&>td:last-child]:border-r",
        "[&>td]:shadow-[0_1px_2px_rgba(16,24,40,0.03)]",
        "[&:hover>td]:border-zinc-300/70 [&:hover>td]:bg-zinc-50/60",
        index != null && "fx-fade",
        className
      )}
      style={index != null ? { animationDelay: `${Math.min(index, 14) * 35}ms` } : undefined}
    >
      {children}
    </tr>
  )
}

export function SoftTd({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <td className={cn("px-4 py-3.5 align-middle first:pl-5 last:pr-5", className)}>{children}</td>
}
