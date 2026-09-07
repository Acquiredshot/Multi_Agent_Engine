import { useState } from "react"
import { FileBarChart, Radar, ScanText, ShieldCheck } from "lucide-react"
import Panel from "../components/common/Panel"
import StatusDot from "../components/common/StatusDot"
import { buildAgentHeatmap, agentCardMetrics } from "../data/mockMetrics"
import AgentHeatmap from "../components/dashboard/AgentHeatmap"
import AgentCard from "../components/dashboard/AgentCard"
import { AGENTS, REPORTING_STAGE } from "../constants/agents"
import { cn } from "../utils/cn"

const AGENT_PROFILES = [
  {
    key: "ocr",
    icon: ScanText,
    accent: "text-cyan-400",
    border: "hover:border-cyan-500/30",
    role: "Text Extraction",
    description:
      "Extracts machine-readable text from source documents. First stage of the pipeline; output feeds downstream agents when pipeline mode is enabled.",
    queue: "OCR",
  },
  {
    key: "compliance",
    icon: ShieldCheck,
    accent: "text-violet-400",
    border: "hover:border-violet-500/30",
    role: "Policy Evaluation",
    description:
      "Evaluates extracted content against compliance and policy rules. Runs in parallel with anomaly detection.",
    queue: "Compliance",
  },
  {
    key: "anomaly",
    icon: Radar,
    accent: "text-fuchsia-400",
    border: "hover:border-fuchsia-500/30",
    role: "Pattern Analysis",
    description:
      "Flags suspicious or unusual document patterns for review. Runs in parallel with compliance.",
    queue: "Anomaly",
  },
  {
    key: "reporting",
    icon: FileBarChart,
    accent: "text-amber-400",
    border: "hover:border-amber-500/30",
    role: "Aggregation",
    description:
      "Aggregates OCR, compliance and anomaly outputs into the final task result stored in Redis.",
    queue: "Aggregate",
  },
]

export default function Agents() {
  const [selected, setSelected] = useState("ocr")
  const heatmap = buildAgentHeatmap()
  const active = AGENT_PROFILES.find((a) => a.key === selected)

  const cards = AGENT_PROFILES.map((profile) => ({
    key: profile.key,
    name: profile.key === "reporting" ? "REPORTING AGENT" : `${profile.key.toUpperCase()} AGENT`,
    ...agentCardMetrics[profile.key],
    activity: heatmap.cells[AGENT_PROFILES.indexOf(profile)] || heatmap.cells[0],
    demo: true,
  }))

  return (
    <div className="space-y-3.5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Agents</h2>
        <p className="text-[11px] text-slate-500">
          Registered processing agents and their runtime configuration
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Agent list */}
        <Panel title="Registered Agents" bodyClassName="p-2">
          <ul className="space-y-1">
            {AGENT_PROFILES.map((agent) => {
              const metrics = agentCardMetrics[agent.key]
              const activeState = String(metrics.status).toLowerCase()
              return (
                <li key={agent.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(agent.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded border px-3 py-2.5 text-left transition",
                      selected === agent.key
                        ? "border-slate-600/60 bg-ink-750"
                        : "border-transparent hover:bg-ink-750/60"
                    )}
                  >
                    <agent.icon size={16} className={agent.accent} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-slate-200">
                        {agent.role}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-slate-600">
                        queue: {agent.queue}
                      </span>
                    </span>
                    <StatusDot status={activeState} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        {/* Detail */}
        <div className="space-y-3.5">
          <Panel title="Agent Detail">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded border border-ink-700 bg-ink-850",
                  active.accent
                )}
              >
                <active.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    {active.key === "reporting"
                      ? REPORTING_STAGE.fullName
                      : AGENTS.find((a) => a.key === active.key)?.fullName || active.role}
                  </h3>
                  <span className="rounded-sm border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                    {active.queue}
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">
                  {active.description}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-700/60 pt-3 sm:grid-cols-4">
              <Stat label="Status" value={agentCardMetrics[active.key].status} ok />
              <Stat label="Mean Rate" value={`${agentCardMetrics[active.key].meanRate} ms`} />
              <Stat label="Error Rate" value={`${agentCardMetrics[active.key].errorRate}%`} />
              <Stat label="Tasks OK" value={agentCardMetrics[active.key].success} />
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-amber-300/70">
              Metrics are demo data — connect worker /metrics scrape for live values
            </p>
          </Panel>

          <AgentHeatmap data={heatmap} demo />
        </div>
      </div>

      {/* All agent cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((agent) => (
          <AgentCard key={agent.key} agent={agent} />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, ok }) {
  return (
    <div>
      <p className="tlabel">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm font-semibold",
          ok ? "text-emerald-300" : "text-slate-200"
        )}
      >
        {value}
      </p>
    </div>
  )
}
