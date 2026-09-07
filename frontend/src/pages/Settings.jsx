import { useState } from "react"
import { Check, Database, Info, Server } from "lucide-react"
import Panel from "../components/common/Panel"
import { API_BASE_URL } from "../services/api"

const POLL_KEY = "multi-agent-engine:poll-interval"

const STACK = [
  { name: "FastAPI", role: "REST API", note: "GET /health · POST /documents · GET /tasks/{id}" },
  { name: "Celery", role: "Task queue", note: "Dedicated queues per agent" },
  { name: "RabbitMQ", role: "Message broker", note: "Routes tasks to OCR / Compliance / Anomaly workers" },
  { name: "Redis", role: "State store", note: "Task states and results (result backend)" },
  { name: "Prometheus", role: "Metrics scrape", note: "GET /metrics on the API" },
  { name: "Grafana", role: "Dashboards", note: "Provisioned datasource via docker compose" },
]

export default function Settings() {
  const [poll, setPoll] = useState(() => {
    const v = Number(localStorage.getItem(POLL_KEY))
    return Number.isFinite(v) && v >= 1000 ? v : 2000
  })
  const [saved, setSaved] = useState(false)

  const savePoll = (value) => {
    const v = Math.max(1000, Number(value) || 2000)
    setPoll(v)
    try {
      localStorage.setItem(POLL_KEY, String(v))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      // storage unavailable — ignore
    }
  }

  return (
    <div className="space-y-3.5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Settings</h2>
        <p className="text-[11px] text-slate-500">
          Frontend configuration and engine connection details
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        {/* Connection */}
        <Panel title="API Connection" subtitle="Read-only — configured via environment">
          <div className="space-y-3">
            <div>
              <p className="tlabel">API Base URL</p>
              <p className="mt-1 break-all rounded border border-ink-700 bg-ink-950/80 px-3 py-2 font-mono text-xs text-emerald-300">
                {API_BASE_URL}
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500">
                <Info size={12} className="mt-0.5 shrink-0" />
                Set <span className="font-mono text-slate-400">VITE_API_URL</span> in
                frontend/.env (dev proxy: <span className="font-mono text-slate-400">/api → localhost:8000</span>).
              </p>
            </div>

            <div>
              <p className="tlabel">Task Poll Interval</p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="1000"
                  step="500"
                  className="input max-w-[140px] font-mono text-xs"
                  value={poll}
                  onChange={(e) => savePoll(e.target.value)}
                />
                <span className="text-[11px] text-slate-500">ms</span>
                {saved && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                    <Check size={12} /> Saved
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                How often task details refresh while a task is running (min 1000 ms).
              </p>
            </div>
          </div>
        </Panel>

        {/* Stack */}
        <Panel title="Engine Stack" subtitle="Backend services behind this UI">
          <ul className="divide-y divide-ink-700/50">
            {STACK.map((item) => (
              <li key={item.name} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-ink-700 bg-ink-850 text-slate-400">
                  {item.name === "Redis" || item.name === "RabbitMQ" ? (
                    <Database size={12} />
                  ) : (
                    <Server size={12} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-200">
                    {item.name}
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {item.role}
                    </span>
                  </p>
                  <p className="truncate font-mono text-[10px] text-slate-600">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
