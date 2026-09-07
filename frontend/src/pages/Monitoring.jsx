import { useMemo } from "react"
import { useOutletContext } from "react-router-dom"
import { AlertTriangle, AlertOctagon, Info, Radio } from "lucide-react"
import Panel from "../components/common/Panel"
import QueueChart from "../components/dashboard/QueueChart"
import WorkflowChart from "../components/dashboard/WorkflowChart"
import {
  buildIngestionSeries,
  buildQueueSeries,
  queueAlerts,
  stateStoreMetrics,
} from "../data/mockMetrics"
import StateStorePanel from "../components/dashboard/StateStorePanel"
import { cn } from "../utils/cn"

const SEVERITY = {
  info: { icon: Info, classes: "text-sky-400 border-sky-500/25 bg-sky-500/[0.06]" },
  warning: { icon: AlertTriangle, classes: "text-amber-300 border-amber-500/25 bg-amber-500/[0.06]" },
  critical: { icon: AlertOctagon, classes: "text-red-300 border-red-500/25 bg-red-500/[0.06]" },
}

export default function Monitoring() {
  const { refreshSignal } = useOutletContext()

  // refreshSignal is referenced as an intentional cache-buster so the
  // demo series regenerate on manual refresh.
  const ingestion = useMemo(() => {
    void refreshSignal
    return buildIngestionSeries()
  }, [refreshSignal])
  const queue = useMemo(() => {
    void refreshSignal
    return buildQueueSeries()
  }, [refreshSignal])

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Monitoring / Telemetry
          </h2>
          <p className="text-[11px] text-slate-500">
            Prometheus-compatible metrics view · mirrors the Grafana dashboard
          </p>
        </div>
        <span className="flex items-center gap-1.5 self-start rounded border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
          <Radio size={11} />
          Series shown are demo data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <WorkflowChart data={ingestion} demo />
        <QueueChart data={queue} demo />
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Alert feed */}
        <Panel
          title="Alert Feed"
          subtitle="Queue and worker events"
          bodyClassName="p-2"
        >
          <ul className="divide-y divide-ink-700/50">
            {queueAlerts.map((alert) => {
              const sev = SEVERITY[alert.severity]
              return (
                <li key={alert.id} className="flex items-center gap-3 px-2.5 py-2.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border",
                      sev.classes
                    )}
                  >
                    <sev.icon size={12} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                    {alert.text}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">{alert.id}</span>
                  <span className="hidden font-mono text-[10px] text-slate-500 sm:block">
                    {alert.time}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="px-2.5 pb-1 pt-2 text-[10px] text-slate-600">
            Demo feed — wire to Prometheus alertmanager when available.
          </p>
        </Panel>

        <StateStorePanel metrics={stateStoreMetrics} demo />
      </div>
    </div>
  )
}
