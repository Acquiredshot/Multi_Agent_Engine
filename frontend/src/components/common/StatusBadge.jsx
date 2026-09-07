import { cn } from "../../utils/cn"
import { getStatusCategory } from "../../utils/status"

// Category → styling. Status values are normalized through getStatusCategory.
const CATEGORIES = {
  success: {
    label: "Completed",
    classes: "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-300",
    dot: "bg-emerald-400",
  },
  processing: {
    label: "Processing",
    classes: "border-amber-500/30 bg-amber-500/[0.07] text-amber-300",
    dot: "bg-amber-400 animate-pulse-dot",
  },
  pending: {
    label: "Pending",
    classes: "border-slate-600/50 bg-slate-500/[0.08] text-slate-300",
    dot: "bg-slate-400",
  },
  failed: {
    label: "Failed",
    classes: "border-red-500/30 bg-red-500/[0.07] text-red-300",
    dot: "bg-red-400",
  },
  healthy: {
    label: "Operational",
    classes: "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-300",
    dot: "bg-emerald-400",
  },
  degraded: {
    label: "Degraded",
    classes: "border-amber-500/30 bg-amber-500/[0.07] text-amber-300",
    dot: "bg-amber-400",
  },
  offline: {
    label: "Offline",
    classes: "border-red-500/30 bg-red-500/[0.07] text-red-300",
    dot: "bg-red-400",
  },
}

/**
 * Reusable status badge. Accepts any status string (backend states,
 * demo labels, health states) and normalizes it to a consistent color.
 */
export default function StatusBadge({ status, label, className }) {
  const category = getStatusCategory(status) || "pending"
  const style = CATEGORIES[category]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium",
        style.classes,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label || style.label}
    </span>
  )
}
