// Shared status categorization used by StatusBadge and status filters.

const ALIASES = {
  success: [
    "success",
    "succeeded",
    "successful",
    "completed",
    "complete",
    "done",
    "ready",
    "ok",
  ],
  processing: [
    "processing",
    "started",
    "in progress",
    "in_progress",
    "inprogress",
    "running",
    "retry",
    "retrying",
  ],
  pending: ["pending", "queued", "waiting", "idle", "unknown"],
  failed: ["failed", "failure", "revoked", "error", "errored", "cancelled"],
  healthy: ["operational", "healthy", "connected", "online", "up"],
  degraded: ["degraded", "warning", "warn", "checking"],
  offline: ["offline", "down", "unreachable", "disconnected"],
}

/** Normalize any status string to a category: success | processing | pending | failed | healthy | degraded | offline | null */
export function getStatusCategory(status) {
  const s = String(status || "").toLowerCase().trim()
  for (const [category, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(s)) return category
  }
  return null
}