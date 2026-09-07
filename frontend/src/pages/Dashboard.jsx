import { useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import {
  buildAgentHeatmap,
  buildIngestionSeries,
  buildQueueSeries,
  agentCardMetrics,
  gaugeMetrics,
  performanceSummary,
  serviceStatuses,
  stateStoreMetrics,
} from "../data/mockMetrics"
import Gauge from "../components/dashboard/Gauge"
import WorkflowChart from "../components/dashboard/WorkflowChart"
import AgentHeatmap from "../components/dashboard/AgentHeatmap"
import AgentCard from "../components/dashboard/AgentCard"
import AgentPerformanceSummary from "../components/dashboard/AgentPerformanceSummary"
import StateStorePanel from "../components/dashboard/StateStorePanel"
import QueueChart from "../components/dashboard/QueueChart"
import ServiceStatus from "../components/dashboard/ServiceStatus"
import { getMonitoringStatus } from "../services/api"
import { AGENTS, REPORTING_STAGE } from "../constants/agents"

/**
 * Main monitoring grid. Real data: none of the monitoring series are
 * exposed by the backend yet — everything below is DEMO data from
 * mockMetrics.js except the Services panel, which overlays the live
 * GET /monitoring/status response when reachable.
 */
export default function Dashboard() {
  const navigate = useNavigate()
  const { refreshSignal } = useOutletContext()

  // Stable per-mount series (regenerated on manual refresh).
  // refreshSignal is referenced as an intentional cache-buster.
  const ingestion = useMemo(() => {
    void refreshSignal
    return buildIngestionSeries()
  }, [refreshSignal])
  const queue = useMemo(() => {
    void refreshSignal
    return buildQueueSeries()
  }, [refreshSignal])
  const heatmap = useMemo(() => {
    void refreshSignal
    return buildAgentHeatmap()
  }, [refreshSignal])
  // Demo agent cards + reporting stage card.
  const cards = useMemo(
    () => [
      ...AGENTS.map((a) => ({
        key: a.key,
        name: a.fullName.toUpperCase(),
        ...agentCardMetrics[a.key],
        activity: heatmap.cells[AGENTS.findIndex((x) => x.key === a.key)],
        demo: true,
      })),
      {
        key: REPORTING_STAGE.key,
        name: REPORTING_STAGE.fullName.toUpperCase(),
        ...agentCardMetrics[REPORTING_STAGE.key],
        activity: heatmap.cells[3],
        demo: true,
      },
    ],
    [heatmap]
  )

  // Services panel: DEMO defaults overlaid with live /monitoring/status.
  const [liveOverlay, setLiveOverlay] = useState({})

  useEffect(() => {
    let cancelled = false
    getMonitoringStatus()
      .then((m) => {
        if (cancelled || !m) return
        const overlay = {}
        if (m.api) overlay.API = m.api.status === "ok" ? "UP" : "DOWN"
        if (m.rabbitmq) overlay.RabbitMQ = m.rabbitmq.status === "ok" ? "UP" : "DOWN"
        if (m.redis) overlay.Redis = m.redis.status === "ok" ? "UP" : "DOWN"
        if (m.workers?.ocr)
          overlay["OCR Worker"] = m.workers.ocr.status === "ok" ? "UP" : "DOWN"
        if (m.workers?.compliance)
          overlay["Compliance Worker"] = m.workers.compliance.status === "ok" ? "UP" : "DOWN"
        if (m.workers?.anomaly)
          overlay["Anomaly Worker"] = m.workers.anomaly.status === "ok" ? "UP" : "DOWN"
        setLiveOverlay(overlay)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refreshSignal])

  const services = useMemo(
    () =>
      serviceStatuses.map((svc) =>
        liveOverlay[svc.name] ? { ...svc, status: liveOverlay[svc.name] } : svc
      ),
    [liveOverlay]
  )

  return (
    <div className="space-y-3.5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Operations Dashboard
          </h2>
          <p className="text-[11px] text-slate-500">
            Live overview of ingestion, agent activity and infrastructure health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-ink-700 bg-ink-850 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Demo metrics unless tagged LIVE
          </span>
          <button
            type="button"
            className="btn-primary !py-1.5 !text-xs"
            onClick={() => navigate("/documents")}
          >
            Submit Document
          </button>
        </div>
      </div>

      {/* Section 1+2: ingestion chart + gauge */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <WorkflowChart data={ingestion} demo />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-1">
          <Gauge
            label="Active Workflows"
            value={gaugeMetrics.activeWorkflows}
            max={gaugeMetrics.activeWorkflowsMax}
            unit="workflows"
            statusText="System Active"
            status="active"
            demo
          />
          <AgentPerformanceSummary summary={performanceSummary} demo />
        </div>
      </div>

      {/* Section 3: heatmap */}
      <AgentHeatmap data={heatmap} demo />

      {/* Section 4: agent cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((agent) => (
          <AgentCard key={agent.key} agent={agent} />
        ))}
      </div>

      {/* Sections 6+7+8: store / queue / services */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <StateStorePanel metrics={stateStoreMetrics} demo />
        <QueueChart data={queue} demo />
        <ServiceStatus services={services} />
      </div>
    </div>
  )
}
