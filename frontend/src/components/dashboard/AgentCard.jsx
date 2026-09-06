import { Radar, ScanText, ShieldCheck } from "lucide-react"
import StatusBadge from "../common/StatusBadge"
import { cn } from "../../utils/cn"

const AGENT_ICONS = {
  ocr: { icon: ScanText, classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  compliance: {
    icon: ShieldCheck,
    classes: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  anomaly: {
    icon: Radar,
    classes: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  },
}

/**
 * Agent status card. `agent` = { key, name, status, queue, description, activity }.
 */
export default function AgentCard({ agent }) {
  const visual = AGENT_ICONS[agent.key] || AGENT_ICONS.ocr
  const Icon = visual.icon

  return (
    <div className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border",
              visual.classes
            )}
          >
            <Icon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
            <p className="text-xs text-slate-500">
              Queue: <span className="font-medium text-slate-400">{agent.queue}</span>
            </p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-400">
        {agent.description}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {agent.activity}
      </div>
    </div>
  )
}