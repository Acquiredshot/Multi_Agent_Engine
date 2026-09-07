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
  completed: { dot: "bg-emerald-400", line: "bg-emerald-500/40", text: "Completed", textClass: "text-emerald-300" },
  processing: { dot: "bg-amber-400 animate-pulse-dot", line: "bg-amber-500/40", text: "Processing", textClass: "text-amber-300" },
  queued: { dot: "bg-slate-600", line: "bg-ink-700", text: "Queued", textClass: "text-slate-500" },
  failed: { dot: "bg-red-400", line: "bg-red-500/40", text: "Failed", textClass: "text-red-300" },
}

function Stage({ label, sublabel, status }) {
  const style = STAGE_STYLES[status] || STAGE_STYLES.queued
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", style.dot)} />
        <span className={cn("mt-1 w-px flex-1", style.line)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-200">{label}</p>
        {sublabel && <p className="font-mono text-[10px] text-slate-600">{sublabel}</p>}
      </div>
      <span className={cn("text-[11px] font-medium", style.textClass)}>{style.text}</span>
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
      sublabel: AGENT_BY_KEY[key]?.queue ? `queue: ${AGENT_BY_KEY[key].queue}` : undefined,
    })),
    ...(task.pipeline !== false
      ? [{ label: "Aggregate", sublabel: "merge results" }]
      : []),
  ]
  const stageStatuses = inferStageStatuses(state, stages.length)

  return (
    <div className="panel flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-ink-700/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="tlabel text-slate-400">Task Details</h3>
          <p className="mt-1 break-all font-mono text-xs text-slate-400">
            {task.task_id}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 transition hover:bg-ink-750 hover:text-slate-300"
          aria-label="Close task details"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="tlabel">Document</p>
            <p className="mt-1 text-[13px] font-medium text-slate-200">
              {task.document_id || "—"}
            </p>
          </div>
          <div>
            <p className="tlabel">Status</p>
            <div className="mt-1">
              <StatusBadge status={state} />
            </div>
          </div>
        </div>

        {/* Polling indicator */}
        {pollingActive && (
          <div className="flex items-center gap-2 rounded border border-ink-700/70 bg-ink-950/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <Loader2 size={12} className="animate-spin text-emerald-400" />
            Polling task every 2s…
          </div>
        )}
        {polling.error && (
          <div className="flex items-center gap-2 rounded border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1.5 text-[11px] text-amber-300">
            <AlertTriangle size={12} className="shrink-0" />
            {polling.error.message || "Polling failed — will keep retrying."}
          </div>
        )}

        {/* Agent progress timeline */}
        <div>
          <h4 className="tlabel">Agent Progress</h4>
          <ul className="mt-3">
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
            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              <CheckCircle2 size={12} /> Final Result
            </h4>
            <pre className="mt-2 max-h-64 overflow-auto rounded border border-ink-700 bg-ink-950/80 p-2.5 font-mono text-[10px] leading-relaxed text-slate-300">
              {typeof effective.result === "string"
                ? effective.result
                : JSON.stringify(effective.result, null, 2)}
            </pre>
          </div>
        )}

        {effective.error && (
          <div className="flex items-start gap-2.5 rounded border border-red-500/25 bg-red-500/[0.06] p-3 text-xs text-red-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">Task failed</p>
              <p className="mt-0.5 break-words text-[11px]">{effective.error}</p>
            </div>
          </div>
        )}

        {state.toUpperCase() === "SUCCESS" && effective.result == null && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <RefreshCw size={12} />
            Task succeeded — result not yet available in the task record.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-ink-700/60 px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-600">
        <GitMerge size={12} className="shrink-0" />
        {task.pipeline === false
          ? "Fan-out mode (agents run independently)"
          : "Pipeline mode (OCR feeds downstream)"}
      </div>
    </div>
  )
}
