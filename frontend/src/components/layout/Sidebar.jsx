import { NavLink } from "react-router-dom"
import {
  Activity,
  BrainCircuit,
  ClipboardList,
  FileText,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react"
import { cn } from "../../utils/cn"

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/health", label: "System Health", icon: Activity },
]

/**
 * Fixed sidebar on desktop, slide-in drawer on mobile.
 * `collapsed` only affects desktop; the mobile drawer always shows full width.
 */
export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur transition-all duration-200",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-64",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-800/80 px-4",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-slate-950 shadow-lg shadow-cyan-500/20">
              <BrainCircuit size={20} strokeWidth={2.2} />
            </div>
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <p className="truncate text-sm font-bold tracking-tight text-white">
                Multi-Agent Engine
              </p>
              <p className="truncate text-[11px] font-medium uppercase tracking-widest text-slate-500">
                Document Intelligence
              </p>
            </div>
          </div>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "ml-auto hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 lg:block",
              collapsed && "lg:ml-0 lg:mt-3"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <item.icon
                    size={18}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  <span className={cn("truncate", collapsed && "lg:hidden")}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Engine status footer */}
        <div
          className={cn(
            "border-t border-slate-800/80 p-4",
            collapsed && "lg:flex lg:justify-center lg:px-0"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-3",
              collapsed && "lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"
            )}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Engine Status
              </p>
              <p className="text-sm font-semibold text-emerald-300">Operational</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}