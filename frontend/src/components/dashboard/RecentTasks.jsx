import { Link } from "react-router-dom"
import { ArrowRight, ClipboardList } from "lucide-react"
import StatusBadge from "../common/StatusBadge"
import { agentLabels } from "../../constants/agents"
import { getTasks } from "../../services/taskStore"
import { recentTasks } from "../../data/demoData"

function TaskId({ id }) {
  return (
    <span
      className="block max-w-[10rem] truncate font-mono text-xs text-slate-300"
      title={id}
    >
      {id}
    </span>
  )
}

function AgentChips({ agentKeys }) {
  return (
    <div className="flex flex-wrap gap-1">
      {agentLabels(agentKeys).map((label) => (
        <span
          key={label}
          className="rounded-md border border-slate-700/70 bg-slate-800/60 px-1.5 py-0.5 text-[11px] font-medium text-slate-300"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function ViewLink({ taskId }) {
  return (
    <Link
      to={`/tasks?task=${encodeURIComponent(taskId)}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
    >
      View <ArrowRight size={12} />
    </Link>
  )
}

/**
 * Recent Tasks card — desktop table, mobile cards.
 * Merges live session tasks with demo data.
 */
export default function RecentTasks() {
  const liveTasks = getTasks()
  const tasks = [...liveTasks, ...recentTasks].slice(0, 5)

  if (tasks.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Tasks</h2>
        </div>
        <p className="mt-4 text-sm text-slate-400">No tasks yet.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Recent Tasks</h2>
        </div>
        <Link
          to="/tasks"
          className="text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          View all
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-semibold">Task ID</th>
              <th className="px-5 py-3 font-semibold">Document</th>
              <th className="px-5 py-3 font-semibold">Agents</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {tasks.map((task) => (
              <tr key={task.task_id} className="transition-colors hover:bg-slate-800/30">
                <td className="px-5 py-3.5">
                  <TaskId id={task.task_id} />
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-200">
                  {task.document_id}
                </td>
                <td className="px-5 py-3.5">
                  <AgentChips agentKeys={task.agentKeys || []} />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400">{task.created}</td>
                <td className="px-5 py-3.5 text-right">
                  <ViewLink taskId={task.task_id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-800/60 md:hidden">
        {tasks.map((task) => (
          <div key={task.task_id} className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <TaskId id={task.task_id} />
              <StatusBadge status={task.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">{task.document_id}</span>
              <span className="text-xs text-slate-500">{task.created}</span>
            </div>
            <div className="flex items-center justify-between">
              <AgentChips agentKeys={task.agentKeys || []} />
              <ViewLink taskId={task.task_id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}