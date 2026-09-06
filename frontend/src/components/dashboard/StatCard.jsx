import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "../../utils/cn"

const ACCENTS = {
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
}

function TrendIcon({ direction }) {
  if (direction === "up") return <ArrowUpRight size={14} className="text-emerald-400" />
  if (direction === "down") return <ArrowDownRight size={14} className="text-red-400" />
  return <Minus size={14} className="text-slate-500" />
}

/**
 * KPI card. `trend` = { value, direction: 'up'|'down'|'neutral', text }.
 */
export default function StatCard({ icon: Icon, label, value, accent = "cyan", trend }) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            ACCENTS[accent] || ACCENTS.cyan
          )}
        >
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <TrendIcon direction={trend.direction} />
          <span className="font-semibold text-slate-200">{trend.value}</span>
          <span className="truncate text-slate-500">{trend.text}</span>
        </div>
      )}
    </div>
  )
}