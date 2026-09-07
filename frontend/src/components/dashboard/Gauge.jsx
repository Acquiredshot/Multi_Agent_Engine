import Panel from "../common/Panel"
import StatusDot from "../common/StatusDot"

/**
 * Compact radial gauge for a single headline metric.
 * Arc goes green → amber as value approaches the max.
 */
export default function Gauge({ label, value, max, unit, statusText, status = "active", demo }) {
  const pct = Math.min(1, value / max)
  const size = 132
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const arc = 0.75 // 270° gauge
  const color = pct > 0.75 ? "#fbbf24" : "#34d399"

  return (
    <Panel
      title={label}
      meta={
        demo && (
          <span className="rounded-sm border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300/80">
            Demo
          </span>
        )
      }
      className="flex flex-col"
      bodyClassName="flex flex-1 flex-col items-center justify-center py-2"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-[225deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1c222c"
            strokeWidth={stroke}
            strokeDasharray={`${c * arc} ${c}`}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${c * arc * pct} ${c}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold leading-none tracking-tight text-slate-100">
            {value}
          </span>
          {unit && <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{unit}</span>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <StatusDot status={status} pulse={status === "active"} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {statusText}
        </span>
      </div>
    </Panel>
  )
}
