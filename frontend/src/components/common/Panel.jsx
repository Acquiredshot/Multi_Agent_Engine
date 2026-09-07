import { cn } from "../../utils/cn"

/**
 * Monitoring panel: hairline border, near-square corners, header strip
 * with uppercase technical label + optional right-side meta/actions.
 */
export default function Panel({ title, subtitle, meta, actions, children, className, bodyClassName }) {
  return (
    <section className={cn("panel", className)}>
      {(title || actions || meta) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-700/60 px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="tlabel text-slate-400">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-slate-600">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {meta}
            {actions}
          </div>
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
