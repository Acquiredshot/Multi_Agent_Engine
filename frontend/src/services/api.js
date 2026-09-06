// Central API client for the Multi-Agent Engine backend.
// All requests go through API_BASE_URL so the URL is never hardcoded in components.

// In dev, requests to /api/* are proxied by Vite to http://localhost:8000
// (see vite.config.js) so no CORS is needed. Set VITE_API_URL to point
// directly at the backend when running a production build elsewhere.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status = 0, code = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      ...options,
    })
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${API_BASE_URL}. Is the backend running?`
    )
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    let code = null
    try {
      const data = await response.json()
      if (data.detail) {
        if (typeof data.detail === "string") {
          detail = data.detail
        } else if (Array.isArray(data.detail)) {
          detail = data.detail
            .map((e) => e.msg || JSON.stringify(e))
            .join("; ")
        }
      }
      if (data.code) code = data.code
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new ApiError(detail, response.status, code)
  }

  return response.json()
}

/** GET /health — liveness plus broker reachability. */
export function checkHealth() {
  return request("/health")
}

/** GET /monitoring/status — consolidated API/broker/Redis/worker health. */
export function getMonitoringStatus() {
  return request("/monitoring/status")
}

/** POST /documents — submit a document for analysis, returns { task_id, ... }. */
export function submitDocument(data) {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** GET /tasks/{task_id} — current state and result of a dispatched task. */
export function getTask(taskId) {
  return request(`/tasks/${encodeURIComponent(taskId)}`)
}