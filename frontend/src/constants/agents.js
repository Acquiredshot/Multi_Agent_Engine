// Agent metadata shared across the UI. Visual styles live here so
// pages and cards stay consistent.
import { FileBarChart, Radar, ScanText, ShieldCheck } from "lucide-react"

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
    fullName: "Anomaly Detection Agent",
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

/** Reporting/aggregation stage (not a selectable agent). */
export const REPORTING_STAGE = {
  key: "reporting",
  name: "Reporting",
  fullName: "Reporting Agent",
  description: "Aggregates agent results into the final report.",
}

/** Icons per agent key (mapped here to keep pages pure data). */
export const AGENT_ICONS = {
  ocr: { icon: ScanText, classes: "border-cyan-500/25 bg-cyan-500/[0.07] text-cyan-400" },
  compliance: { icon: ShieldCheck, classes: "border-violet-500/25 bg-violet-500/[0.07] text-violet-400" },
  anomaly: { icon: Radar, classes: "border-fuchsia-500/25 bg-fuchsia-500/[0.07] text-fuchsia-400" },
  reporting: { icon: FileBarChart, classes: "border-amber-500/25 bg-amber-500/[0.07] text-amber-400" },
}

/** Accent text color per agent key. */
export const AGENT_ACCENT_TEXT = {
  ocr: "text-cyan-400/80",
  compliance: "text-violet-400/80",
  anomaly: "text-fuchsia-400/80",
  reporting: "text-amber-400/80",
}
