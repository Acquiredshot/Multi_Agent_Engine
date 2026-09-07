import { useEffect, useState } from "react"
import { Activity, Menu, RefreshCw } from "lucide-react"
import { cn } from "../../utils/cn"

const API_PILL = {
  checking: {
    text: "CHECKING",
    classes: "border-amber-500/25 bg-amber-500/[0.06] text-amber-300",
    dot: "bg-amber-400 animate-pulse-dot",
  },
  connected: {
    text: "API ONLINE",
    classes: "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300",
    dot: "bg-emerald-400",
  },
  offline: {
    text: "API OFFLINE",
    classes: "border-red-500/25 bg-red-500/[0.06] text-red-300",
    dot: "bg-red-400 animate-pulse-dot",
  },
}

/** Header: engine title + subtitle, system status, API state, last updated, refresh. */
export default function Topbar({
  apiStatus = "checking",
  lastUpdated,
  refreshing,
  onRefresh,
  onMenuClick,
}) {
  const pill = API_PILL[apiStatus] || API_PILL.checking
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const time = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour12: false })
    : clock.toLocaleTimeString([], { hour12: false })

  return (
    <header className="sticky top-0 z-20 border-b border-ink-700/70 bg-ink-900/95 backdrop-blur">
      {/* Row 1: title + controls */}
      <div className="flex h-12 items-center gap-3 px-4 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded p-1.5 text-slate-400 transition hover:bg-ink-750 hover:text-slate-200 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[13px] font-bold uppercase tracking-[0.16em] text-slate-100">
            Intelligent Multi-Agent Workflow Engine
          </h1>
          <p className="hidden truncate text-[11px] text-slate-500 sm:block">
            Real-time workflow orchestration and agent monitoring
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* System status */}
          <span className="hidden items-center gap-1.5 rounded border border-ink-700 bg-ink-850 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:inline-flex">
            <Activity size={11} className="text-emerald-400" />
            System <span className="text-emerald-300">Nominal</span>
          </span>

          {/* API status */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
              pill.classes
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", pill.dot)} />
            {pill.text}
          </span>

          {/* Last updated */}
          <span className="hidden items-center gap-1.5 rounded border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[10px] text-slate-500 lg:inline-flex">
            {time}
          </span>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded border border-ink-700 bg-ink-850 p-1.5 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          </button>
        </div>
      </div>
    </header>
  )
}
