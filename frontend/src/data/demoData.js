// ============================================================
// DEMO DATA
// ------------------------------------------------------------
// Clean, replaceable placeholder data for the dashboard.
// Swap these exports with real API responses later — nothing
// else in the app should change shape.
// ============================================================

export const dashboardStats = [
  {
    id: "total",
    label: "Total Documents",
    value: "1,248",
    accent: "cyan",
    trend: { value: "+12.4%", direction: "up", text: "vs last week" },
  },
  {
    id: "processing",
    label: "Processing",
    value: "24",
    accent: "amber",
    trend: { value: "3 active", direction: "neutral", text: "in queue right now" },
  },
  {
    id: "completed",
    label: "Completed",
    value: "1,186",
    accent: "emerald",
    trend: { value: "+8.2%", direction: "up", text: "vs last month" },
  },
  {
    id: "failed",
    label: "Failed",
    value: "38",
    accent: "red",
    trend: { value: "-2.1%", direction: "down", text: "vs last week" },
  },
]

export const agentStatuses = [
  {
    key: "ocr",
    name: "OCR Agent",
    status: "Operational",
    queue: "OCR",
    description: "Extracts machine-readable text from documents.",
    activity: "~14 docs/min",
  },
  {
    key: "compliance",
    name: "Compliance Agent",
    status: "Operational",
    queue: "Compliance",
    description: "Evaluates documents against policy and compliance rules.",
    activity: "Last run 2 min ago",
  },
  {
    key: "anomaly",
    name: "Anomaly Detection",
    status: "Operational",
    queue: "Anomaly",
    description: "Identifies suspicious or unusual document patterns.",
    activity: "3 flags in last hour",
  },
]

export const recentTasks = [
  {
    task_id: "task_8f42a9c1",
    document_id: "INV-4471",
    agentKeys: ["ocr", "compliance", "anomaly"],
    status: "Completed",
    created: "2 min ago",
    duration: "1m 12s",
    live: false,
  },
  {
    task_id: "task_7b21d4e0",
    document_id: "INV-4472",
    agentKeys: ["ocr", "compliance"],
    status: "Processing",
    created: "5 min ago",
    duration: "—",
    live: false,
  },
  {
    task_id: "task_5ac9f3b2",
    document_id: "CONTRACT-102",
    agentKeys: ["ocr", "anomaly"],
    status: "Failed",
    created: "12 min ago",
    duration: "42s",
    live: false,
  },
  {
    task_id: "task_1e77aa04",
    document_id: "PO-8810",
    agentKeys: ["ocr", "compliance", "anomaly"],
    status: "Pending",
    created: "18 min ago",
    duration: "—",
    live: false,
  },
]