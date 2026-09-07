import { Link, useParams } from "react-router-dom"
import { ArrowLeft, FileText, GitMerge, Radar, ScanText, ShieldCheck } from "lucide-react"
import Panel from "../components/common/Panel"
import StatusBadge from "../components/common/StatusBadge"
import EmptyState from "../components/common/EmptyState"
import TaskDetailPanel from "../components/tasks/TaskDetailPanel"
import { getTasks, updateTask } from "../services/taskStore"
import { recentTasks } from "../data/demoData"
import { cn } from "../utils/cn"

const PIPELINE_STAGES = [
  { key: "ocr", label: "OCR", icon: ScanText, accent: "text-cyan-400", border: "border-cyan-500/30" },
  {
    key: "compliance",
    label: "Compliance",
    icon: ShieldCheck,
    accent: "text-violet-400",
    border: "border-violet-500/30",
  },
  {
    key: "anomaly",
    label: "Anomaly Detection",
    icon: Radar,
    accent: "text-fuchsia-400",
    border: "border-fuchsia-500/30",
  },
  {
    key: "aggregate",
    label: "Aggregate",
    icon: GitMerge,
    accent: "text-amber-400",
    border: "border-amber-500/30",
  },
]

export default function TaskDetails() {
  const { taskId } = useParams()

  // Same merge logic as the Tasks list (live session tasks + demo rows).
  const live = getTasks()
  const task =
    live.find((t) => t.task_id === taskId) ||
    recentTasks.find((t) => t.task_id === taskId) ||
    null

  if (!task) {
    return (
      <div className="space-y-3.5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Task Details</h2>
          <p className="text-[11px] text-slate-500">
            Unknown task ID — it may belong to another browser session
          </p>
        </div>
        <EmptyState
          icon={FileText}
          title="Task not found"
          description={`No task with ID ${taskId} exists in this session. Live tasks submitted here appear automatically.`}
          action={
            <Link to="/tasks" className="btn-secondary">
              <ArrowLeft size={14} /> Back to Tasks
            </Link>
          }
        />
      </div>
    )
  }

  const agentKeys = task.agentKeys?.length
    ? task.agentKeys
    : ["ocr", "compliance", "anomaly"]

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3">
        <Link
          to="/tasks"
          className="flex h-7 w-7 items-center justify-center rounded border border-ink-700 bg-ink-850 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          aria-label="Back to tasks"
        >
          <ArrowLeft size={14} />
        </Link>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Task Details</h2>
          <p className="break-all font-mono text-[11px] text-slate-500">{task.task_id}</p>
        </div>
      </div>

      {/* Meta strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <MetaCard label="Task ID" value={<span className="font-mono text-xs">{task.task_id}</span>} />
        <MetaCard label="Overall Status" value={<StatusBadge status={task.state || task.status} />} />
        <MetaCard
          label="Created"
          value={<span className="text-sm text-slate-200">{task.created || "just now"}</span>}
        />
        <MetaCard
          label="Processing Time"
          value={
            <span className="font-mono text-sm text-slate-200">{task.duration || "—"}</span>
          }
        />
      </div>

      {/* Pipeline visualization */}
      <Panel
        title="Agent Pipeline"
        subtitle={task.pipeline === false ? "Fan-out mode — agents run independently" : "Pipeline mode — OCR feeds downstream"}
      >
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {PIPELINE_STAGES.filter(
            (s) => s.key === "aggregate" || agentKeys.includes(s.key)
          ).map((stage, i, arr) => (
            <div key={stage.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex flex-1 items-center gap-2.5 rounded border bg-ink-850 px-3 py-2.5",
                  stage.border
                )}
              >
                <stage.icon size={16} className={stage.accent} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-slate-200">
                    {stage.label}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                    {stage.key === "aggregate" ? "redis" : `queue: ${stage.key}`}
                  </p>
                </div>
              </div>
              {i < arr.length - 1 && (
                <span className="hidden h-px w-4 shrink-0 bg-slate-600 sm:block" />
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Live detail panel (polls + renders result) */}
      <TaskDetailPanel
        task={task}
        onUpdate={(updated) => updateTask(task.task_id, updated)}
        onClose={() => window.history.back()}
      />
    </div>
  )
}

function MetaCard({ label, value }) {
  return (
    <div className="panel px-3.5 py-3">
      <p className="tlabel">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  )
}
