import { CheckCircle2, XCircle } from "lucide-react"
import Panel from "../common/Panel"
import StatusDot from "../common/StatusDot"
import { AGENT_ICONS, AGENT_ACCENT_TEXT } from "../../constants/agents"
import { DemoTag } from "./WorkflowChart"
import { cn } from "../../utils/cn"

/**
 * Compact agent monitoring card.
 * `agent` = { key, name, status, meanRate, errorRate, activity[], success, errors, demo }
 */
export default function AgentCard({ agent }) {
  const visual = AGENT_ICONS[agent.key] || AGENT_ICONS.ocr
  const Icon = visual.icon
  const statusKey = String(agent.status || "idle").toLowerCase()
  const isDemo = Boolean(agent.demo)

  return (
    <Panel
      className="panel-hover flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col p-4"
      title={agent.name}
      meta={
        <div className="flex items-center gap-2">
          {isDemo && <DemoTag />}
          <span className="flex items-center gap-1.5">
            <StatusDot status={statusKey} pulse={statusKey === "active"} />
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                statusKey === "active" ? "text-emerald-300" : "text-amber-300"
              )}
            >
              {agent.status}
            </span>
          </span>
        </div>
      }
    >
      {/* Icon + metrics row */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded border",
            visual.classes
          )}
        >
          <Icon size={17} />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <Metric label="Mean Rate" value={`${agent.meanRate ?? 0} ms`} />
          <Metric
            label="Error Rate"
            value={`${agent.errorRate ?? 0}%`}
            tone={agent.errorRate > 1 ? "warn" : "ok"}
          />
        </div>
      </div>

      {/* Activity strip */}
      <div className="mt-3 flex h-8 items-end gap-[3px]">
        {(agent.activity || []).map((v, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-[1px]",
              v > 0.7 ? "bg-emerald-400/80" : v > 0.4 ? "bg-emerald-400/45" : "bg-emerald-400/20"
            )}
            style={{ height: `${Math.max(12, v * 100)}%` }}
          />
        ))}
      </div>

      {/* Counters */}
      <div className="mt-3 flex items-center gap-4 border-t border-ink-700/60 pt-2.5 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-400">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="font-mono font-medium text-slate-200">{agent.success ?? 0}</span> ok
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <XCircle size={12} className="text-red-400/80" />
          <span className="font-mono font-medium text-slate-200">{agent.errors ?? 0}</span> err
        </span>
        <span
          className={cn(
            "ml-auto font-mono text-[10px] uppercase tracking-wider",
            AGENT_ACCENT_TEXT[agent.key] || "text-slate-500"
          )}
        >
          {agent.key}
        </span>
      </div>
    </Panel>
  )
}

function Metric({ label, value, tone = "ok" }) {
  return (
    <div className="min-w-0">
      <p className="tlabel">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-base font-semibold",
          tone === "warn" ? "text-amber-300" : "text-slate-100"
        )}
      >
        {value}
      </p>
    </div>
  )
}
