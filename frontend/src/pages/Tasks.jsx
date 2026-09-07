import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowRight,
  ClipboardList,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import StatusBadge from "../components/common/StatusBadge"
import { getStatusCategory } from "../utils/status"
import EmptyState from "../components/common/EmptyState"
import TaskDetailPanel from "../components/tasks/TaskDetailPanel"
import { agentLabels } from "../constants/agents"
import { getTasks, updateTask } from "../services/taskStore"
import { recentTasks } from "../data/demoData"
import { cn } from "../utils/cn"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
]

function mergeTasks() {
  const live = getTasks()
  const known = new Set(live.map((t) => t.task_id))
  return [...live, ...recentTasks.filter((t) => !known.has(t.task_id))]
}

function TaskId({ id }) {
  return (
    <span className="block max-w-[10rem] truncate font-mono text-xs text-slate-300" title={id}>
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
          className="rounded-sm border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

export default function Tasks() {
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState(mergeTasks)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  // Deep-link support: /tasks?task=<id> preselects that task.
  const [selectedId, setSelectedId] = useState(() => searchParams.get("task"))

  const refresh = () => setTasks(mergeTasks())

  const handleUpdate = (updated) => {
    setTasks((prev) =>
      prev.map((t) => (t.task_id === updated.task_id ? { ...t, ...updated } : t))
    )
    if (updated.task_id) updateTask(updated.task_id, updated)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((task) => {
      if (filter !== "all" && getStatusCategory(task.status) !== filter) return false
      if (!q) return true
      return (
        task.task_id.toLowerCase().includes(q) ||
        String(task.document_id || "").toLowerCase().includes(q)
      )
    })
  }, [tasks, search, filter])

  const selected = tasks.find((t) => t.task_id === selectedId) || null

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Task Monitor</h2>
          <p className="text-[11px] text-slate-500">
            Live task states are polled from the backend every 2 seconds
          </p>
        </div>
        <button type="button" className="btn-secondary shrink-0 !py-1.5 !text-xs" onClick={refresh}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            type="text"
            className="input pl-8"
            placeholder="Search task ID or document…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <SlidersHorizontal size={14} className="shrink-0 text-slate-600" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-sm border px-2.5 py-1 text-[11px] font-medium transition",
                filter === f.key
                  ? "border-emerald-500/40 bg-emerald-500/[0.07] text-emerald-300"
                  : "border-ink-700 bg-ink-850 text-slate-500 hover:border-slate-600 hover:text-slate-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Tasks list */}
        <div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tasks found"
              description={
                search || filter !== "all"
                  ? "No tasks match the current search or filter."
                  : "Submit a document to start a task."
              }
            />
          ) : (
            <div className="panel overflow-hidden">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-700/60 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-4 py-2.5 font-semibold">Task ID</th>
                      <th className="px-4 py-2.5 font-semibold">Document</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">Agents</th>
                      <th className="px-4 py-2.5 font-semibold">Started</th>
                      <th className="px-4 py-2.5 font-semibold">Duration</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700/40">
                    {filtered.map((task) => (
                      <tr
                        key={task.task_id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-ink-750/70",
                          selectedId === task.task_id && "bg-emerald-500/[0.04]"
                        )}
                        onClick={() => setSelectedId(task.task_id)}
                      >
                        <td className="px-4 py-2.5">
                          <TaskId id={task.task_id} />
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-200">
                          {task.document_id || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <AgentChips agentKeys={task.agentKeys || []} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {task.submitted_at ? "just now" : task.created}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                          {task.duration || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            View <ArrowRight size={11} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-ink-700/40 md:hidden">
                {filtered.map((task) => (
                  <div
                    key={task.task_id}
                    className="space-y-2.5 p-3.5"
                    onClick={() => setSelectedId(task.task_id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <TaskId id={task.task_id} />
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-200">
                        {task.document_id || "—"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {task.submitted_at ? "just now" : task.created}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <AgentChips agentKeys={task.agentKeys || []} />
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        View <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full page link */}
          <div className="mt-2.5 text-right">
            <Link
              to={selectedId ? `/tasks/${encodeURIComponent(selectedId)}` : "/tasks"}
              className="text-[11px] font-medium text-slate-500 transition hover:text-emerald-300"
              onClick={(e) => {
                if (!selectedId) e.preventDefault()
              }}
            >
              Open selected task full page →
            </Link>
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:sticky xl:top-16">
          {selected ? (
            <TaskDetailPanel
              task={selected}
              onUpdate={handleUpdate}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="panel">
              <EmptyState
                icon={ClipboardList}
                title="Select a task"
                description="Click a row to inspect its agent progress and final result."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
