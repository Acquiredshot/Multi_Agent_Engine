import { cn } from "../../utils/cn"

/**
 * Minimal status dot: green (up/active), amber (warning/idle),
 * red (down/failed), slate (unknown). Optional glow for healthy states.
 */
const COLORS = {
  up: { dot: "bg-emerald-400", glow: "shadow-[0_0_6px_rgba(52,211,153,0.55)]" },
  active: { dot: "bg-emerald-400", glow: "shadow-[0_0_6px_rgba(52,211,153,0.55)]" },
  warning: { dot: "bg-amber-400", glow: "" },
  idle: { dot: "bg-amber-400", glow: "" },
  down: { dot: "bg-red-400", glow: "" },
  failed: { dot: "bg-red-400", glow: "" },
  unknown: { dot: "bg-slate-500", glow: "" },
}

export default function StatusDot({ status = "up", pulse = false, className }) {
  const color = COLORS[status] || COLORS.unknown
  return (
    <span className={cn("relative inline-flex h-1.5 w-1.5 shrink-0", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-pulse-dot rounded-full",
            color.dot
          )}
        />
      )}
      <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", color.dot, color.glow)} />
    </span>
  )
}
