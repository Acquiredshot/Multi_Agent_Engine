import Panel from "../common/Panel"
import { DemoTag } from "./WorkflowChart"
import { cn } from "../../utils/cn"

/**
 * Agent performance overview heatmap.
 * `data` = { agents: string[], cells: number[][] } with intensity 0..1.
 */
const BUCKETS = 12

export default function AgentHeatmap({ data, demo }) {
  const { agents, cells } = data

  return (
    <Panel
      title="Agent Performance Overview"
      subtitle="Processing activity · last 60 min"
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col justify-between p-4"
      meta={demo && <DemoTag />}
    >
      <div className="min-w-0">
        {/* Time axis */}
        <div className="mb-1.5 flex pl-[104px]">
          {Array.from({ length: BUCKETS }, (_, i) => (
            <span key={i} className="flex-1 text-center font-mono text-[9px] text-slate-600">
              {i % 2 === 0 ? `-${(BUCKETS - i) * 5}m` : ""}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {agents.map((agent, a) => (
            <div key={agent} className="flex items-center gap-2">
              <span className="w-[96px] shrink-0 truncate text-right text-[11px] font-medium text-slate-400">
                {agent}
              </span>
              <div className="flex flex-1 gap-1">
                {cells[a].map((v, i) => (
                  <div
                    key={i}
                    title={`${agent} · -${(BUCKETS - i) * 5}m · intensity ${(v * 100).toFixed(0)}%`}
                    className={cn(
                      "h-7 flex-1 rounded-[2px] border transition-transform duration-100 hover:scale-y-110",
                      v > 0.66
                        ? "border-emerald-400/40"
                        : v > 0.33
                          ? "border-emerald-400/20"
                          : "border-emerald-400/10"
                    )}
                    style={{ background: `rgba(52, 211, 153, ${0.05 + v * 0.75})` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between border-t border-ink-700/60 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="tlabel">Low</span>
          <div className="flex gap-[3px]">
            {[0.08, 0.24, 0.42, 0.62, 0.85].map((v) => (
              <span
                key={v}
                className="h-2.5 w-4 rounded-[2px]"
                style={{ background: `rgba(52, 211, 153, ${0.05 + v * 0.75})` }}
              />
            ))}
          </div>
          <span className="tlabel">High</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
          5 min buckets
        </span>
      </div>
    </Panel>
  )
}
