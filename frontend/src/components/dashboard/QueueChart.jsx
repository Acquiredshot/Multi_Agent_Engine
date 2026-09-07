import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Panel from "../common/Panel"
import { ChartTooltip } from "./ChartTooltip"
import { AXIS_PROPS, GRID_PROPS } from "./chartTheme"
import { DemoTag } from "./WorkflowChart"

/**
 * Celery queue backlog & latency.
 * `data` = [{ time, depth, latency }] (DEMO series).
 */
export default function QueueChart({ data, demo }) {
  const last = data[data.length - 1] || {}
  const maxDepth = Math.max(...data.map((d) => d.depth || 0), 10)

  return (
    <Panel
      title="Celery Queue Backlog & Latency"
      subtitle="Queue depth vs processing latency"
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col p-4"
      meta={
        <div className="flex items-center gap-3">
          {demo && <DemoTag />}
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-[2px] bg-emerald-400/60" /> Depth
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-px w-3 bg-teal-300" /> Latency
            </span>
          </div>
          <div className="hidden items-baseline gap-1 border-l border-ink-700 pl-3 sm:flex">
            <span className="font-mono text-lg font-semibold leading-none text-emerald-300">
              {last.depth ?? "—"}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600">msgs</span>
          </div>
        </div>
      }
    >
      <div className="mb-2 flex gap-4">
        <MiniStat label="Current Depth" value={last.depth ?? "—"} />
        <MiniStat label="Latency" value={`${last.latency ?? "—"}s`} />
        <MiniStat label="Peak Depth" value={maxDepth} />
      </div>
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="time" {...AXIS_PROPS} interval={7} tickMargin={6} />
            <YAxis yAxisId="depth" {...AXIS_PROPS} width={44} tickCount={5} />
            <YAxis yAxisId="latency" orientation="right" {...AXIS_PROPS} width={38} tickCount={5} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
            <Bar
              yAxisId="depth"
              dataKey="depth"
              name="Queue depth"
              fill="rgba(52, 211, 153, 0.35)"
              stroke="rgba(52, 211, 153, 0.7)"
              strokeWidth={0.5}
              isAnimationActive={false}
            />
            <Line
              yAxisId="latency"
              type="monotone"
              dataKey="latency"
              name="Latency (s)"
              stroke="#2dd4bf"
              strokeWidth={1.4}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="tlabel">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-slate-200">{value}</p>
    </div>
  )
}
