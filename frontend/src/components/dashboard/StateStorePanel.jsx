import Panel from "../common/Panel"
import StatusDot from "../common/StatusDot"
import { DemoTag } from "./WorkflowChart"

/**
 * System state store: Redis connection pool, error latency, Postgres CPU.
 * `metrics` = { redisConnections: {current, max}, errorLatency, postgresCpu } (DEMO).
 */
export default function StateStorePanel({ metrics, demo }) {
  const redis = metrics.redisConnections
  const redisPct = Math.round((redis.current / redis.max) * 100)

  return (
    <Panel
      title="System State Store"
      meta={demo && <DemoTag />}
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col justify-center gap-3.5 p-4"
    >
      <StoreRow
        label="Redis Connections"
        value={
          <span className="font-mono text-sm font-semibold text-slate-100">
            {redis.current}
            <span className="text-slate-500">/{redis.max}</span>
          </span>
        }
        bar={{ pct: redisPct, color: "bg-emerald-400/70" }}
      />

      <StoreRow
        label="Error Latency"
        value={
          <span className="font-mono text-sm font-semibold text-emerald-300">
            {metrics.errorLatency}%
          </span>
        }
        bar={{ pct: Math.max(2, metrics.errorLatency * 8), color: "bg-emerald-400/70" }}
      />

      <StoreRow
        label="Postgres CPU"
        value={
          <span
            className={`font-mono text-sm font-semibold ${
              metrics.postgresCpu > 70 ? "text-amber-300" : "text-slate-100"
            }`}
          >
            {metrics.postgresCpu}%
          </span>
        }
        bar={{
          pct: metrics.postgresCpu,
          color: metrics.postgresCpu > 70 ? "bg-amber-400/70" : "bg-emerald-400/70",
        }}
        status={metrics.postgresCpu > 70 ? "warning" : "up"}
      />
    </Panel>
  )
}

function StoreRow({ label, value, bar, status = "up" }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <StatusDot status={status} />
          <span className="tlabel">{label}</span>
        </span>
        {value}
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full ${bar.color}`}
          style={{ width: `${Math.min(100, bar.pct)}%` }}
        />
      </div>
    </div>
  )
}
