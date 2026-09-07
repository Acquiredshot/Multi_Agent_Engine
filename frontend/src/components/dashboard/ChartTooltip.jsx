/** Shared dark technical tooltip for recharts. */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-ink-700 bg-ink-900/95 px-2.5 py-2 shadow-xl shadow-black/50">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color || entry.stroke }} />
            <span className="text-[11px] text-slate-400">{entry.name}</span>
            <span className="ml-auto pl-3 font-mono text-[11px] font-medium text-slate-200">
              {formatter ? formatter(entry.value, entry.dataKey) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
