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
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
              "relative flex flex-col items-start gap-2 rounded border p-3 text-left transition",
              selected
                ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                : "border-ink-700 bg-ink-950/60 hover:border-slate-600"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-sm border",
                selected
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-ink-700 bg-ink-800 text-slate-500"
              )}
            >
              <Icon size={14} className={selected ? visual.active : undefined} />
            </span>
            <span className="text-[13px] font-semibold text-slate-200">{agent.name}</span>
            <span className="text-[11px] leading-snug text-slate-500">
              {agent.description}
            </span>
            <span
              className={cn(
                "absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-sm border transition",
                selected
                  ? "border-emerald-400 bg-emerald-400 text-ink-950"
                  : "border-slate-600 bg-ink-800 text-transparent"
              )}
            >
              <Check size={11} strokeWidth={3} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
