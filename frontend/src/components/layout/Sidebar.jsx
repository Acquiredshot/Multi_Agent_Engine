import { NavLink } from "react-router-dom"
import {
  Activity,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  Workflow,
  X,
} from "lucide-react"
import { cn } from "../../utils/cn"

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/agents", label: "Agents", icon: Boxes },
  { to: "/health", label: "System Health", icon: Activity },
  { to: "/monitoring", label: "Monitoring", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
]

/** Compact enterprise sidebar: fixed 224px on desktop, drawer on mobile. */
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/70 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-ink-700/70 bg-ink-900 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="flex h-12 items-center gap-2.5 border-b border-ink-700/70 px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Workflow size={15} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 lg:block">
            <p className="truncate text-[13px] font-bold tracking-tight text-slate-100">
              Multi-Agent Engine
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded p-1 text-slate-500 transition hover:text-slate-300 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section label */}
        <p className="tlabel px-4 pb-1.5 pt-4">Operations</p>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-2.5 rounded px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/[0.07] text-emerald-300"
                    : "text-slate-400 hover:bg-ink-750 hover:text-slate-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-emerald-400 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <item.icon
                    size={15}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Pipeline footer */}
        <div className="border-t border-ink-700/70 p-3">
          <div className="rounded border border-ink-700/70 bg-ink-850 p-2.5">
            <div className="flex items-center justify-between">
              <span className="tlabel">Pipeline</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {["OCR", "CMP", "ANO", "AGG"].map((stage, i) => (
                <div key={stage} className="flex flex-1 items-center gap-1">
                  <span className="flex-1 rounded-sm bg-ink-700/80 px-1 py-1 text-center font-mono text-[9px] font-medium text-slate-400">
                    {stage}
                  </span>
                  {i < 3 && <span className="h-px w-1.5 bg-ink-700" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
