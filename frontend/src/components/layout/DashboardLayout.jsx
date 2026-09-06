import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { checkHealth } from "../../services/api"
import { cn } from "../../utils/cn"

const PAGE_META = {
  "/": {
    title: "Dashboard",
    subtitle: "Monitor your document intelligence workflow",
  },
  "/documents": {
    title: "Documents",
    subtitle: "Submit documents to the analysis pipeline",
  },
  "/tasks": {
    title: "Tasks",
    subtitle: "Monitor and inspect analysis tasks",
  },
  "/health": {
    title: "System Health",
    subtitle: "Service and infrastructure status",
  },
}

/**
 * App shell: sidebar + topbar + routed content.
 * Also owns the API health check shown in the topbar.
 */
export default function DashboardLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [apiStatus, setApiStatus] = useState("checking")

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const health = await checkHealth()
        if (cancelled) return
        setApiStatus(health.status === "ok" ? "connected" : "offline")
      } catch {
        if (cancelled) return
        setApiStatus("offline")
      }
    }

    check()
    const timer = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const meta = PAGE_META[location.pathname] || {
    title: "Multi-Agent Engine",
    subtitle: "Document Intelligence",
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-200",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64"
        )}
      >
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          apiStatus={apiStatus}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-800/60 px-4 py-4 text-center text-xs text-slate-600 sm:px-6 lg:px-8">
          Multi-Agent Engine · Document Intelligence
        </footer>
      </div>
    </div>
  )
}