// Agent metadata shared across the UI. Icons are intentionally
// mapped in components (per-agent) so this stays pure data.

export const AGENTS = [
  {
    key: "ocr",
    name: "OCR",
    fullName: "OCR Agent",
    queue: "OCR",
    description: "Extract machine-readable text from documents.",
  },
  {
    key: "compliance",
    name: "Compliance",
    fullName: "Compliance Agent",
    queue: "Compliance",
    description: "Evaluate documents against policy and compliance rules.",
  },
  {
    key: "anomaly",
    name: "Anomaly Detection",
    fullName: "Anomaly Detection",
    queue: "Anomaly",
    description: "Identify suspicious or unusual document patterns.",
  },
]

export const AGENT_BY_KEY = Object.fromEntries(
  AGENTS.map((agent) => [agent.key, agent])
)

/** Backend agent keys → short display label. */
export function agentLabels(agentKeys = []) {
  return agentKeys
    .map((key) => AGENT_BY_KEY[key]?.name || key)
    .filter(Boolean)
}