import Panel from "../common/Panel"

/**
 * Services status panel. `services` = [{ name, status: "UP"|"WARN"|"DOWN", latency }].
 * Live backend data can override the DEMO defaults via the `services` prop.
 */
const STATUS_STYLE = {
  UP: { text: "text-emerald-300", bg: "bg-emerald-400" },
  WARN: { text: "text-amber-300", bg: "bg-amber-400" },
  DOWN: { text: "text-red-300", bg: "bg-red-400" },
}

export default function ServiceStatus({ services }) {
  return (
    <Panel
      title="Services"
      subtitle="Core infrastructure"
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col justify-center p-2"
    >
      <ul className="divide-y divide-ink-700/50">
        {services.map((svc) => {
          const style = STATUS_STYLE[svc.status] || STATUS_STYLE.DOWN
          return (
            <li key={svc.name} className="flex items-center justify-between px-2.5 py-[7px]">
              <span className="flex items-center gap-2.5">
                <span className={`h-1.5 w-1.5 rounded-full ${style.bg} shadow-[0_0_6px_currentColor]`} />
                <span className="text-[12px] font-medium text-slate-300">{svc.name}</span>
              </span>
              <span className="flex items-center gap-2.5">
                {svc.latency && (
                  <span className="font-mono text-[10px] text-slate-600">{svc.latency}</span>
                )}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                  ● {svc.status}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
