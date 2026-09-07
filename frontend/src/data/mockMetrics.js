// ============================================================
// DEMO / MOCK METRICS — NOT BACKEND DATA
// ------------------------------------------------------------
// These time series and gauges are NOT exposed by the current
// backend (FastAPI / Celery / RabbitMQ / Redis). They exist so
// the monitoring visuals render like the reference dashboard.
//
// Each export documents the real-API swap point in a comment.
// Shapes are stable: replacing the source with a fetch call
// requires no component changes.
// ============================================================

/** Deterministic PRNG so series don't jump between renders. */
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Build a smooth random walk with occasional spikes. */
function series({ points = 40, base, variance, min = 0, max = Infinity, spikes = 0, spikeScale = 1.6, seed = 1 }) {
  const rand = mulberry32(seed)
  const out = []
  let value = base
  for (let i = 0; i < points; i++) {
    value += (rand() - 0.5) * variance
    // Mean-revert toward base so the walk stays in band.
    value += (base - value) * 0.08
    let v = value
    if (spikes > 0 && i % Math.floor(points / spikes) === 0 && i > 2) {
      v *= spikeScale
      value = base + (v - base) * 0.4
    }
    out.push(Math.max(min, Math.min(max, v)))
  }
  return out
}

/** Build the full ingestion series with time labels. */
export function buildIngestionSeries(now = new Date()) {
  const req = series({ points: 40, base: 142, variance: 26, min: 40, spikes: 4, seed: 7 })
  const completed = req.map((v, i) => v * (0.72 + mulberry32(i + 21)() * 0.1))
  const failed = req.map((v) => v * (0.02 + mulberry32(Math.floor(v) + 3)() * 0.03))

  return req.map((v, i) => {
    const t = new Date(now.getTime() - (req.length - 1 - i) * 60000)
    return {
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      requests: Math.round(v),
      completed: Math.round(completed[i]),
      failed: Math.round(failed[i]),
    }
  })
}

/** Radial gauge values (single snapshot). */
export const gaugeMetrics = {
  activeWorkflows: 145,
  activeWorkflowsMax: 200,
  systemActive: true,
}

/** 4 agents x 12 time buckets heatmap intensity 0..1 (DEMO). */
export function buildAgentHeatmap() {
  const agents = ["OCR", "Compliance", "Anomaly Detection", "Reporting"]
  const seeds = [11, 23, 37, 53]
  const cells = agents.map((agent, a) => {
    const row = series({
      points: 12,
      base: 0.45 + a * 0.08,
      variance: 0.5,
      min: 0.05,
      max: 1,
      seed: seeds[a],
    })
    return row.map((v) => Math.max(0.06, Math.min(1, v)))
  })
  return { agents, cells }
}

/** Per-agent card metrics (DEMO — replace with /metrics scrape later). */
export const agentCardMetrics = {
  ocr: { status: "ACTIVE", meanRate: 0, errorRate: 0, success: 1284, errors: 0 },
  compliance: { status: "ACTIVE", meanRate: 132, errorRate: 0.4, success: 1187, errors: 5 },
  anomaly: { status: "ACTIVE", meanRate: 214, errorRate: 1.2, success: 1102, errors: 13 },
  reporting: { status: "IDLE", meanRate: 98, errorRate: 0, success: 640, errors: 0 },
}

/** Roll-up summary strip (DEMO). */
export const performanceSummary = {
  meanProcessingTime: 154,
  errorRate: 0,
}

/** Infrastructure store snapshot (DEMO). */
export const stateStoreMetrics = {
  redisConnections: { current: 50, max: 50 },
  errorLatency: 0,
  postgresCpu: 32,
}

/** Celery queue depth + latency series (DEMO). */
export function buildQueueSeries(now = new Date()) {
  const depth = series({ points: 40, base: 36, variance: 18, min: 2, max: 160, spikes: 3, spikeScale: 2.4, seed: 31 })
  const latency = depth.map((v, i) => Math.max(0.2, (v / 40) * (0.8 + mulberry32(i + 91)() * 0.5)))

  return depth.map((v, i) => {
    const t = new Date(now.getTime() - (depth.length - 1 - i) * 60000)
    return {
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      depth: Math.round(v),
      latency: Number(latency[i].toFixed(2)),
    }
  })
}

/** Services status panel (DEMO statuses; live /monitoring/status overlays them). */
export const serviceStatuses = [
  { name: "API", status: "UP", latency: "12ms" },
  { name: "RabbitMQ", status: "UP", latency: "3ms" },
  { name: "Redis", status: "UP", latency: "1ms" },
  { name: "OCR Worker", status: "UP", latency: "—" },
  { name: "Compliance Worker", status: "UP", latency: "—" },
  { name: "Anomaly Worker", status: "UP", latency: "—" },
]

/** Queue backlog alerts used by the Monitoring page. */
export const queueAlerts = [
  { id: "AL-2214", severity: "warning", text: "Compliance queue depth above 120 for 2m", time: "09:41:07" },
  { id: "AL-2209", severity: "info", text: "Reporting agent transitioned to IDLE", time: "09:12:44" },
  { id: "AL-2201", severity: "critical", text: "Anomaly worker restart detected", time: "08:58:19" },
]
