import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Database,
  Network,
  Radar,
  RefreshCw,
  ScanText,
  Server,
  ShieldCheck,
} from "lucide-react"
import StatusBadge from "../components/common/StatusBadge"
import StatusDot from "../components/common/StatusDot"
import LoadingSpinner from "../components/common/LoadingSpinner"
import Panel from "../components/common/Panel"
import { checkHealth, getMonitoringStatus } from "../services/api"
import { serviceStatuses } from "../data/mockMetrics"
import { cn } from "../utils/cn"

// ------------------------------------------------------------------
// Infrastructure rows. Status comes from the real backend
// GET /monitoring/status response; GET /health plus DEMO placeholders
// are the fallback when the endpoint is absent.
// ------------------------------------------------------------------
const SERVICES = [
  {
    key: "api",
    name: "API",
    icon: Server,
    accent: "text-cyan-400",
    description: "FastAPI server exposing document and task endpoints.",
    resolve: (monitoring, health) => {
      if (monitoring?.api) {
        return {
          status: toStatus(monitoring.api.status),
          detail: monitoring.api.detail || "API responding",
          live: true,
        }
      }
      return {
        status: health ? (health.status === "ok" ? "Operational" : "Degraded") : "Offline",
        detail: health ? `App: ${health.app} · v${health.version}` : "No response from /health",
        live: Boolean(health),
      }
    },
  },
  {
    key: "broker",
    name: "RabbitMQ",
    icon: Network,
    accent: "text-orange-400",
    description: "Message broker routing tasks to agent queues.",
    resolve: (monitoring, health) => {
      if (monitoring?.rabbitmq) {
        return {
          status: toStatus(monitoring.rabbitmq.status),
          detail: monitoring.rabbitmq.detail || "Broker status",
          live: true,
        }
      }
      return {
        status: health
          ? health.broker_reachable
            ? "Operational"
            : "Offline"
          : "Offline",
        detail: health
          ? health.broker_reachable
            ? "Broker reachable"
            : "Broker unreachable"
          : "Unknown",
        live: Boolean(health),
      }
    },
  },
  {
    key: "redis",
    name: "Redis",
    icon: Database,
    accent: "text-red-400",
    description: "Result backend and cache for task states.",
    resolve: (monitoring) => {
      if (monitoring?.redis) {
        return {
          status: toStatus(monitoring.redis.status),
          detail: monitoring.redis.detail || "Redis status",
          live: true,
        }
      }
      return { status: "Operational", detail: "Demo status — /monitoring/status unavailable", live: false }
    },
  },
  {
    key: "ocr_worker",
    name: "OCR Worker",
    icon: ScanText,
    accent: "text-cyan-400",
    description: "Celery worker consuming the OCR queue.",
    resolve: (monitoring, health) => {
      if (monitoring?.workers?.ocr) {
        return {
          status: toStatus(monitoring.workers.ocr.status),
          detail: monitoring.workers.ocr.detail || "Worker status",
          live: true,
        }
      }
      return {
        status: health ? "Operational" : "Offline",
        detail: health ? `OCR backend: ${health.ocr_backend || "unknown"}` : "Unknown",
        live: Boolean(health),
      }
    },
  },
  {
    key: "compliance_worker",
    name: "Compliance Worker",
    icon: ShieldCheck,
    accent: "text-violet-400",
    description: "Celery worker consuming the Compliance queue.",
    resolve: (monitoring) => {
      if (monitoring?.workers?.compliance) {
        return {
          status: toStatus(monitoring.workers.compliance.status),
          detail: monitoring.workers.compliance.detail || "Worker status",
          live: true,
        }
      }
      return { status: "Operational", detail: "Demo status — /monitoring/status unavailable", live: false }
    },
  },
  {
    key: "anomaly_worker",
    name: "Anomaly Worker",
    icon: Radar,
    accent: "text-fuchsia-400",
    description: "Celery worker consuming the Anomaly queue.",
    resolve: (monitoring) => {
      if (monitoring?.workers?.anomaly) {
        return {
          status: toStatus(monitoring.workers.anomaly.status),
          detail: monitoring.workers.anomaly.detail || "Worker status",
          live: true,
        }
      }
      return { status: "Operational", detail: "Demo status — /monitoring/status unavailable", live: false }
    },
  },
]

/** Backend status strings → display status for the badge. */
function toStatus(raw) {
  if (raw === "ok") return "Operational"
  if (raw === "idle") return "Degraded"
  return "Offline"
}

export default function SystemHealth() {
  const [monitoring, setMonitoring] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async ({ showSpinner = false } = {}) => {
    if (showSpinner) {
      setLoading(true)
      setError(null)
    }
    try {
      const data = await getMonitoringStatus()
      setMonitoring(data)
      setError(null)
    } catch (err) {
      setMonitoring(null)
      setError(err.message || "Failed to reach the monitoring endpoint.")
      try {
        setHealth(await checkHealth())
      } catch {
        setHealth(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch runs via a nonce so the effect body stays async-safe.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await getMonitoringStatus()
        if (cancelled) return
        setMonitoring(data)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setMonitoring(null)
        setError(err.message || "Failed to reach the monitoring endpoint.")
        try {
          const h = await checkHealth()
          if (!cancelled) setHealth(h)
        } catch {
          if (!cancelled) setHealth(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">System Health</h2>
          <p className="text-[11px] text-slate-500">
            Live status from{" "}
            <span className="font-mono text-slate-400">GET /monitoring/status</span>{" "}
            with /health fallback
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[10px] text-slate-500">
            Checked {new Date().toLocaleTimeString([], { hour12: false })}
          </span>
          <button
            type="button"
            className="btn-secondary shrink-0 !py-1.5 !text-xs"
            onClick={() => load({ showSpinner: true })}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : undefined} />
            Check Again
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded border border-red-500/25 bg-red-500/[0.06] p-3.5 text-xs text-red-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Monitoring check failed</p>
            <p className="mt-0.5 break-words">{error}</p>
          </div>
        </div>
      )}

      {loading && !monitoring && !health ? (
        <Panel>
          <LoadingSpinner center label="Contacting the monitoring endpoint…" />
        </Panel>
      ) : (
        <>
          {/* API summary */}
          <Panel bodyClassName="flex items-center justify-between gap-4 p-3.5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded border border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-100">API Server</p>
                <p className="font-mono text-[10px] text-slate-500">
                  {monitoring?.api?.detail ||
                    (health ? `${health.app} · v${health.version}` : "No health data available")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(monitoring?.checked_at || health?.checked_at) && (
                <p className="hidden font-mono text-[10px] text-slate-500 sm:block">
                  Last check{" "}
                  {new Date(monitoring?.checked_at || health?.checked_at).toLocaleTimeString([], {
                    hour12: false,
                  })}
                </p>
              )}
              <StatusBadge
                status={
                  monitoring?.api
                    ? toStatus(monitoring.api.status)
                    : health
                      ? health.status === "ok"
                        ? "Operational"
                        : "Degraded"
                      : "Offline"
                }
              />
            </div>
          </Panel>

          {/* Service rows */}
          <Panel title="Infrastructure Services" bodyClassName="p-2">
            <ul className="divide-y divide-ink-700/40">
              {SERVICES.map((service) => {
                const resolved = service.resolve(monitoring, health)
                const category = resolved.status
                return (
                  <li
                    key={service.key}
                    className="flex flex-col gap-2 px-2.5 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-ink-700 bg-ink-850",
                          service.accent
                        )}
                      >
                        <service.icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-200">
                          {service.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:justify-end">
                      <p className="hidden max-w-[260px] truncate font-mono text-[10px] text-slate-600 lg:block">
                        {resolved.detail}
                      </p>
                      <span
                        className={cn(
                          "rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          resolved.live
                            ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300/80"
                            : "border-amber-500/25 bg-amber-500/[0.06] text-amber-300/80"
                        )}
                      >
                        {resolved.live ? "Live" : "Fallback"}
                      </span>
                      <StatusBadge status={category} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          {/* Reference services strip (DEMO latencies) */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
            {serviceStatuses.map((svc) => (
              <div key={svc.name} className="panel flex items-center justify-between px-3 py-2.5">
                <span className="text-[11px] font-medium text-slate-400">{svc.name}</span>
                <span className="flex items-center gap-1.5">
                  <StatusDot status={svc.status === "UP" ? "up" : "down"} />
                  <span className="font-mono text-[10px] text-slate-600">{svc.latency}</span>
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Status is reported live by GET /monitoring/status (broker ping, Redis ping,
            RabbitMQ consumers). Rows tagged "Fallback" use /health or demo data.
          </p>
        </>
      )}
    </div>
  )
}
