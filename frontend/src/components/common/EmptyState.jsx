import { Inbox } from "lucide-react"

/**
 * Reusable empty state panel shown when a list has no rows.
 */
export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-ink-700 bg-ink-850/40 px-6 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded border border-ink-700 bg-ink-800 text-slate-500">
        <Icon size={18} />
      </div>
      <h3 className="text-[13px] font-semibold text-slate-300">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
