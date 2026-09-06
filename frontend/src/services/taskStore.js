// Lightweight client-side store for tasks submitted during this session.
// Persisted in localStorage so tasks survive navigation and reloads.
// Only stores what the submit endpoint actually returned — never fake data.

const STORAGE_KEY = "multi-agent-engine:tasks"

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Storage unavailable (private mode etc.) — keep in-memory only.
  }
}

/** All stored tasks, newest first. */
export function getTasks() {
  return read()
}

/** Register a task returned by POST /documents. */
export function addTask(task) {
  const tasks = read()
  const next = [
    {
      ...task,
      // The backend returns `agents`; the UI reads `agentKeys`.
      agentKeys: task.agentKeys || task.agents || [],
      pipeline: task.pipeline !== undefined ? task.pipeline : true,
      live: true,
      createdLabel: "just now",
    },
    ...tasks.filter((t) => t.task_id !== task.task_id),
  ]
  write(next)
  return next
}

/** Patch a stored task (e.g. with fresh polling state). */
export function updateTask(taskId, patch) {
  const tasks = read().map((t) =>
    t.task_id === taskId ? { ...t, ...patch } : t
  )
  write(tasks)
  return tasks
}