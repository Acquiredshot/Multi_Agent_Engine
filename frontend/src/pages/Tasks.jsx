import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
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
          className="rounded-md border border-slate-700/70 bg-slate-800/60 px-1.5 py-0.5 text-[11px] font-medium text-slate-300"
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
  // Deep-link support: /tasks?task=<id> opens that task on mount.
  const [selectedId, setSelectedId] = useState(() => searchParams.get("task"))

  const refresh = () => setTasks(mergeTasks())

  const handleUpdate = (updated) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.task_id === updated.task_id ? { ...t, ...updated } : t
      )
      return next
    })
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Task Monitor</h2>
          <p className="mt-1 text-sm text-slate-400">
            Live task states are polled from the backend every 2 seconds.
          </p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search task ID or document…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <SlidersHorizontal size={15} className="shrink-0 text-slate-500" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                filter === f.key
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-700/70 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
            <div className="card overflow-hidden">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3 font-semibold">Task ID</th>
                      <th className="px-5 py-3 font-semibold">Document</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Agents</th>
                      <th className="px-5 py-3 font-semibold">Started</th>
                      <th className="px-5 py-3 font-semibold">Duration</th>
                      <th className="px-5 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filtered.map((task) => (
                      <tr
                        key={task.task_id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-slate-800/30",
                          selectedId === task.task_id && "bg-cyan-500/5"
                        )}
                        onClick={() => setSelectedId(task.task_id)}
                      >
                        <td className="px-5 py-3.5">
                          <TaskId id={task.task_id} />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-200">
                          {task.document_id || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <AgentChips agentKeys={task.agentKeys || []} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {task.submitted_at ? "just now" : task.created}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {task.duration || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400">
                            View <ArrowRight size={12} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-800/60 md:hidden">
                {filtered.map((task) => (
                  <div
                    key={task.task_id}
                    className="space-y-3 p-4"
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
                      <span className="text-xs text-slate-500">
                        {task.submitted_at ? "just now" : task.created}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <AgentChips agentKeys={task.agentKeys || []} />
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400">
                        View <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="xl:sticky xl:top-24">
          {selected ? (
            <TaskDetailPanel
              task={selected}
              onUpdate={handleUpdate}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="card p-6">
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