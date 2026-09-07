import { useCallback, useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { checkHealth } from "../../services/api"

/**
 * App shell: sidebar + topbar + routed content.
 * Owns the /health heartbeat shown in the topbar and a global
 * refresh signal (incremented counter) that pages can subscribe to.
 */
export default function DashboardLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState("checking")
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const heartbeat = useCallback(async () => {
    try {
      const health = await checkHealth()
      setApiStatus(health?.status === "ok" ? "connected" : "offline")
    } catch {
      setApiStatus("offline")
    }
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await heartbeat()
      if (cancelled) return
    }
    run()
    const timer = setInterval(() => {
      if (!cancelled) heartbeat()
    }, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [heartbeat])

  // Manual refresh: spin + re-run heartbeat + bump the signal.
  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshSignal((s) => s + 1)
    heartbeat().finally(() => setRefreshing(false))
  }

  // Scroll to top on navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-ink-950">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-56">
        <Topbar
          apiStatus={apiStatus}
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-5 sm:px-5 lg:px-6">
          <Outlet context={{ refreshSignal }} />
        </main>
        <footer className="border-t border-ink-700/60 px-6 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
            Multi-Agent Workflow Engine · FastAPI · Celery · RabbitMQ · Redis
          </p>
        </footer>
      </div>
    </div>
  )
}
