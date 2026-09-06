import { Check, Radar, ScanText, ShieldCheck } from "lucide-react"
import { AGENTS } from "../../constants/agents"
import { cn } from "../../utils/cn"

const AGENT_ICONS = {
  ocr: { icon: ScanText, active: "text-cyan-400" },
  compliance: { icon: ShieldCheck, active: "text-violet-400" },
  anomaly: { icon: Radar, active: "text-fuchsia-400" },
}

/**
 * Multi-select agent picker. `value` = array of agent keys,
 * `onChange` = (nextKeys) => void.
 */
export default function AgentSelector({ value = [], onChange }) {
  const toggle = (key) => {
    const next = value.includes(key)
      ? value.filter((k) => k !== key)
      : [...value, key]
    onChange(next)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {AGENTS.map((agent) => {
        const selected = value.includes(agent.key)
        const visual = AGENT_ICONS[agent.key] || AGENT_ICONS.ocr
        const Icon = visual.icon
        return (
          <button
            key={agent.key}
            type="button"
            onClick={() => toggle(agent.key)}
            aria-pressed={selected}
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
              selected
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-slate-700/70 bg-slate-950/40 hover:border-slate-600"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border",
                selected
                  ? "border-cyan-500/30 bg-cyan-500/10"
                  : "border-slate-700 bg-slate-800/60 text-slate-400"
              )}
            >
              <Icon size={16} className={selected ? visual.active : undefined} />
            </span>
            <span className="text-sm font-semibold text-slate-100">{agent.name}</span>
            <span className="text-[11px] leading-snug text-slate-500">
              {agent.description}
            </span>
            <span
              className={cn(
                "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md border transition",
                selected
                  ? "border-cyan-400 bg-cyan-400 text-slate-950"
                  : "border-slate-600 bg-slate-800/60 text-transparent"
              )}
            >
              <Check size={13} strokeWidth={3} />
            </span>
          </button>
        )
      })}
    </div>
  )
}