import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Panel from "../common/Panel"
import { ChartTooltip } from "./ChartTooltip"
import { AXIS_PROPS, GRID_PROPS } from "./chartTheme"

/**
 * Workflow ingestion rate — requests/min area chart.
 * `data` = [{ time, requests, completed, failed }]
 */
export default function WorkflowChart({ data, demo }) {
  const last = data[data.length - 1] || {}
  const peak = Math.max(...data.map((d) => d.requests || 0), 0)

  return (
    <Panel
      title="Workflow Ingestion Rate"
      subtitle="API Requests / Min"
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col p-4"
      meta={
        <div className="flex items-center gap-3">
          {demo && <DemoTag />}
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Requests
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Completed
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" /> Failed
            </span>
          </div>
          <div className="hidden items-baseline gap-1 border-l border-ink-700 pl-3 sm:flex">
            <span className="font-mono text-lg font-semibold leading-none text-emerald-300">
              {last.requests ?? "—"}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600">now</span>
          </div>
        </div>
      }
    >
      <div className="mb-2 flex gap-4">
        <MiniStat label="Peak / min" value={peak} />
        <MiniStat label="Window" value={`${data.length}m`} />
      </div>
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="ingestFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ingestStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="time" {...AXIS_PROPS} interval={7} tickMargin={6} />
            <YAxis {...AXIS_PROPS} width={44} tickCount={5} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2d3540", strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="requests"
              name="Requests/min"
              stroke="url(#ingestStroke)"
              strokeWidth={1.6}
              fill="url(#ingestFill)"
              dot={false}
              activeDot={{ r: 2.5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="failed"
              name="Failed"
              stroke="#f87171"
              strokeOpacity={0.7}
              strokeWidth={1}
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
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

export function DemoTag() {
  return (
    <span className="rounded-sm border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300/80">
      Demo
    </span>
  )
}
