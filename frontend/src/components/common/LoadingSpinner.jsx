import { Loader2 } from "lucide-react"
import { cn } from "../../utils/cn"

export default function LoadingSpinner({
  size = 20,
  label,
  className,
  center = false,
}) {
  const content = (
    <div className={cn("flex items-center gap-3 text-xs text-slate-400", className)}>
      <Loader2
        className="animate-spin text-emerald-400"
        style={{ width: size, height: size }}
      />
      {label && <span>{label}</span>}
    </div>
  )

  if (!center) return content

  return (
    <div className="flex min-h-40 items-center justify-center py-8">{content}</div>
  )
}