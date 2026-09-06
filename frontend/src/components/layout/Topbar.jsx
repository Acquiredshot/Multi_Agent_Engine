import { Bell, Menu, User } from "lucide-react"
import { cn } from "../../utils/cn"

const API_PILL = {
  checking: {
    text: "Checking…",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400 animate-pulse-dot",
  },
  connected: {
    text: "API Connected",
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  offline: {
    text: "API Offline",
    classes: "border-red-500/30 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
  },
}

/**
 * Top navigation bar: page title on the left, API status + notifications
 * + user avatar on the right.
 */
export default function Topbar({ title, subtitle, apiStatus = "checking", onMenuClick }) {
  const pill = API_PILL[apiStatus] || API_PILL.checking

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
          {title}
        </h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* API status */}
        <span
          className={cn(
            "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:inline-flex",
            pill.classes
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", pill.dot)} />
          {pill.text}
        </span>

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
        </button>

        {/* Avatar placeholder */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white ring-1 ring-white/10">
          <User size={16} />
        </div>
      </div>
    </header>
  )
}