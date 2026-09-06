import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"
import StatusBadge from "../common/StatusBadge"
import { useTaskPolling, TERMINAL_STATES } from "../../hooks/useTaskPolling"
import { AGENT_BY_KEY } from "../../constants/agents"
import { cn } from "../../utils/cn"

// Stage statuses shown in the progress timeline, inferred from the
// task's aggregate state (the API does not expose per-agent progress yet).
function inferStageStatuses(state, stageCount) {
  const normalized = String(state || "PENDING").toUpperCase()
  if (normalized === "SUCCESS") {
    return Array.from({ length: stageCount }, () => "completed")
  }
  if (["FAILURE", "REVOKED"].includes(normalized)) {
    return Array.from({ length: stageCount }, () => "failed")
  }
  if (["STARTED", "PROCESSING", "RETRY"].includes(normalized)) {
    return Array.from({ length: stageCount }, (_, i) =>
      i === 0 ? "processing" : "queued"
    )
  }
  return Array.from({ length: stageCount }, () => "queued")
}

const STAGE_STYLES = {
  completed: { dot: "bg-emerald-400", line: "bg-emerald-500/40", text: "Completed" },
  processing: { dot: "bg-amber-400 animate-pulse-dot", line: "bg-amber-500/40", text: "Processing" },
  queued: { dot: "bg-slate-600", line: "bg-slate-700/60", text: "Queued" },
  failed: { dot: "bg-red-400", line: "bg-red-500/40", text: "Failed" },
}

function Stage({ label, sublabel, status }) {
  const style = STAGE_STYLES[status] || STAGE_STYLES.queued
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", style.dot)} />
        <span className={cn("mt-1 w-px flex-1", style.line)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-500">{sublabel}</p>}
      </div>
      <span className="text-xs font-medium text-slate-400">{style.text}</span>
    </li>
  )
}

/**
 * Task detail panel. Polls GET /tasks/{task_id} for live tasks and
 * renders a progress timeline plus the final result.
 */
export default function TaskDetailPanel({ task, onUpdate, onClose }) {
  const isLive = task.live

  const polling = useTaskPolling(task.task_id, {
    enabled: isLive,
    interval: 2000,
    onUpdate: (res) => {
      onUpdate?.({
        ...task,
        state: res.state,
        result: res.result,
        error: res.error,
        ready: res.ready,
        successful: res.successful,
      })
    },
  })

  const effective = useMemo(() => {
    if (isLive && polling.data) {
      return {
        state: polling.data.state || task.state,
        result: polling.data.result,
        error: polling.data.error,
      }
    }
    return {
      state: task.state,
      result: task.result,
      error: task.error,
    }
  }, [isLive, polling.data, task])

  const state = effective.state || "PENDING"
  const pollingActive =
    isLive && !TERMINAL_STATES.includes(state.toUpperCase()) && !polling.error

  const stages = [
    ...(task.agentKeys || []).map((key) => ({
      label: AGENT_BY_KEY[key]?.fullName || key,
      sublabel: AGENT_BY_KEY[key]?.queue ? `Queue: ${AGENT_BY_KEY[key].queue}` : undefined,
    })),
    ...(task.pipeline !== false
      ? [{ label: "Aggregate", sublabel: "Merge agent results" }]
      : []),
  ]
  const stageStatuses = inferStageStatuses(state, stages.length)

  return (
    <div className="card flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 p-5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white">Task Details</h3>
          <p className="mt-1 break-all font-mono text-xs text-slate-400">
            {task.task_id}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          aria-label="Close task details"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Document
            </p>
            <p className="mt-1 text-sm font-medium text-slate-200">
              {task.document_id || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </p>
            <div className="mt-1">
              <StatusBadge status={state} />
            </div>
          </div>
        </div>

        {/* Polling indicator */}
        {pollingActive && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin text-cyan-400" />
            Polling task every 2s…
          </div>
        )}
        {polling.error && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <AlertTriangle size={13} className="shrink-0" />
            {polling.error.message || "Polling failed — will keep retrying."}
          </div>
        )}

        {/* Agent progress timeline */}
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Agent Progress
          </h4>
          <ul className="mt-4">
            {stages.map((stage, index) => (
              <Stage
                key={stage.label}
                label={stage.label}
                sublabel={stage.sublabel}
                status={stageStatuses[index]}
              />
            ))}
          </ul>
        </div>

        {/* Final result / error */}
        {effective.result != null && (
          <div>
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 size={13} /> Final Result
            </h4>
            <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
              {typeof effective.result === "string"
                ? effective.result
                : JSON.stringify(effective.result, null, 2)}
            </pre>
          </div>
        )}

        {effective.error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">Task failed</p>
              <p className="mt-0.5 break-words text-xs">{effective.error}</p>
            </div>
          </div>
        )}

        {state.toUpperCase() === "SUCCESS" && effective.result == null && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw size={13} />
            Task succeeded — result not yet available in the task record.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-slate-800/80 px-5 py-3 text-[11px] text-slate-600">
        <GitMerge size={13} className="shrink-0" />
        {task.pipeline === false ? "Fan-out mode (agents run independently)" : "Pipeline mode (OCR feeds downstream)"}
      </div>
    </div>
  )
}