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
import LoadingSpinner from "../components/common/LoadingSpinner"
import { checkHealth, getMonitoringStatus } from "../services/api"

// ------------------------------------------------------------------
// Infrastructure cards. Status is derived from the real backend
// GET /monitoring/status response; the old GET /health payload plus
// demo placeholders are the fallback when the endpoint is absent.
// ------------------------------------------------------------------
const SERVICES = [
  {
    key: "api",
    name: "FastAPI",
    icon: Server,
    accent: "text-cyan-400",
    description: "API server exposing document and task endpoints.",
    source: "monitoring",
    resolve: (monitoring, health) => {
      if (monitoring?.api) {
        return {
          status: toStatus(monitoring.api.status),
          detail: monitoring.api.detail || "API responding",
        }
      }
      return {
        status: health ? (health.status === "ok" ? "Operational" : "Degraded") : "Offline",
        detail: health ? `App: ${health.app} · v${health.version}` : "No response from /health",
      }
    },
  },
  {
    key: "broker",
    name: "RabbitMQ",
    icon: Network,
    accent: "text-orange-400",
    description: "Message broker routing tasks to agent queues.",
    source: "monitoring",
    resolve: (monitoring, health) => {
      if (monitoring?.rabbitmq) {
        return {
          status: toStatus(monitoring.rabbitmq.status),
          detail: monitoring.rabbitmq.detail || "Broker status",
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
      }
    },
  },
  {
    key: "redis",
    name: "Redis",
    icon: Database,
    accent: "text-red-400",
    description: "Result backend and cache for task states.",
    source: "monitoring",
    resolve: (monitoring) => {
      if (monitoring?.redis) {
        return {
          status: toStatus(monitoring.redis.status),
          detail: monitoring.redis.detail || "Redis status",
        }
      }
      return { status: "Operational", detail: "Demo status — /monitoring/status unavailable" }
    },
  },
  {
    key: "ocr_worker",
    name: "OCR Worker",
    icon: ScanText,
    accent: "text-cyan-400",
    description: "Runs OCR extraction tasks from the OCR queue.",
    source: "monitoring",
    resolve: (monitoring, health) => {
      if (monitoring?.workers?.ocr) {
        return {
          status: toStatus(monitoring.workers.ocr.status),
          detail: monitoring.workers.ocr.detail || "Worker status",
        }
      }
      return {
        status: health ? "Operational" : "Offline",
        detail: health ? `Backend: ${health.ocr_backend || "unknown"}` : "Unknown",
      }
    },
  },
  {
    key: "compliance_worker",
    name: "Compliance Worker",
    icon: ShieldCheck,
    accent: "text-violet-400",
    description: "Runs compliance evaluation tasks from the Compliance queue.",
    source: "monitoring",
    resolve: (monitoring) => {
      if (monitoring?.workers?.compliance) {
        return {
          status: toStatus(monitoring.workers.compliance.status),
          detail: monitoring.workers.compliance.detail || "Worker status",
        }
      }
      return { status: "Operational", detail: "Demo status — /monitoring/status unavailable" }
    },
  },
  {
    key: "anomaly_worker",
    name: "Anomaly Worker",
    icon: Radar,
    accent: "text-fuchsia-400",
    description: "Runs anomaly detection tasks from the Anomaly queue.",
    source: "monitoring",
    resolve: (monitoring) => {
      if (monitoring?.workers?.anomaly) {
        return {
          status: toStatus(monitoring.workers.anomaly.status),
          detail: monitoring.workers.anomaly.detail || "Worker status",
        }
      }
      return { status: "Operational", detail: "Demo status — /monitoring/status unavailable" }
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
    // Synchronous state updates only when triggered by the user's click,
    // never from inside the mount effect.
    if (showSpinner) {
      setLoading(true)
      setError(null)
    }
    try {
      // Primary source: consolidated monitoring endpoint.
      const data = await getMonitoringStatus()
      setMonitoring(data)
      setError(null)
    } catch (err) {
      setMonitoring(null)
      setError(err.message || "Failed to reach the monitoring endpoint.")
      // Fallback: plain health endpoint still gives API/broker/OCR info.
      try {
        setHealth(await checkHealth())
      } catch {
        setHealth(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await getMonitoringStatus()
        if (!cancelled) {
          setMonitoring(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setMonitoring(null)
          setError(err.message || "Failed to reach the monitoring endpoint.")
          try {
            setHealth(await checkHealth())
          } catch {
            setHealth(null)
          }
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Health</h2>
          <p className="mt-1 text-sm text-slate-400">
            Live status from{" "}
            <span className="font-mono text-slate-300">GET /monitoring/status</span>{" "}
            plus infrastructure overview.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => load({ showSpinner: true })}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
          Check Again
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Monitoring check failed</p>
            <p className="mt-0.5 break-words">{error}</p>
          </div>
        </div>
      )}

      {loading && !monitoring && !health ? (
        <div className="card p-8">
          <LoadingSpinner center label="Contacting the monitoring endpoint…" />
        </div>
      ) : (
        <>
          {/* API summary */}
          <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">API Server</p>
                <p className="text-xs text-slate-500">
                  {monitoring?.api?.detail ||
                    (health ? `${health.app} · v${health.version}` : "No health data available")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {(monitoring?.checked_at || health?.checked_at) && (
                <p className="text-xs text-slate-500">
                  Checked{" "}
                  <span className="font-mono text-slate-400">
                    {new Date(
                      monitoring?.checked_at || health?.checked_at
                    ).toLocaleTimeString()}
                  </span>
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
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SERVICES.map((service) => {
              const resolved = service.resolve(monitoring, health)
              const isDemo = service.source !== "monitoring" || !monitoring
              return (
                <div key={service.key} className="card card-hover p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/60 ${service.accent}`}
                      >
                        <service.icon size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {service.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">{service.queue || "Service"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={resolved.status} />
                      {isDemo && (
                        <span className="rounded border border-slate-700/70 bg-slate-800/60 px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          Fallback
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    {service.description}
                  </p>
                  <p className="mt-3 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
                    {resolved.detail}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-slate-600">
            Status is reported live by{" "}
            <span className="font-mono">GET /monitoring/status</span> on the backend
            (broker ping, Redis ping, RabbitMQ consumers). Cards tagged "Fallback"
            mean the monitoring endpoint was unreachable and older / demo data is
            shown instead.
          </p>
        </>
      )}
    </div>
  )
}