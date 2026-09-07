import Panel from "../common/Panel"
import { DemoTag } from "./WorkflowChart"

/**
 * Agent performance summary strip: mean processing time + error rate.
 * `summary` = { meanProcessingTime, errorRate } (DEMO data).
 */
export default function AgentPerformanceSummary({ summary, demo }) {
  return (
    <Panel
      title="Agent Performance Summary"
      meta={demo && <DemoTag />}
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col justify-center gap-4 p-4"
    >
      <div>
        <p className="tlabel">Mean Processing Time</p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-[34px] font-semibold leading-none tracking-tight text-emerald-300">
            {summary.meanProcessingTime}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">ms</span>
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-emerald-400/70"
            style={{ width: `${Math.min(100, (summary.meanProcessingTime / 400) * 100)}%` }}
          />
        </div>
      </div>

      <div className="border-t border-ink-700/60 pt-3">
        <p className="tlabel">Error Rate</p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-[34px] font-semibold leading-none tracking-tight text-emerald-300">
            {summary.errorRate}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">%</span>
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-emerald-400/70"
            style={{ width: `${Math.max(2, Math.min(100, summary.errorRate * 20))}%` }}
          />
        </div>
      </div>
    </Panel>
  )
}
