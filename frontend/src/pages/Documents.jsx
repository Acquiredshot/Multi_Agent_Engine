import { Boxes, Clock, Radar, ScanText, ShieldCheck } from "lucide-react"
import DocumentUpload from "../components/documents/DocumentUpload"
import { addTask } from "../services/taskStore"

const PIPELINE_NOTES = [
  {
    icon: ScanText,
    title: "OCR Agent",
    text: "Extracts machine-readable text from documents.",
    accent: "text-cyan-400",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Agent",
    text: "Evaluates documents against policy and compliance rules.",
    accent: "text-violet-400",
  },
  {
    icon: Radar,
    title: "Anomaly Detection",
    text: "Identifies suspicious or unusual document patterns.",
    accent: "text-fuchsia-400",
  },
  {
    icon: Boxes,
    title: "Aggregate",
    text: "Merges agent results into a final task outcome.",
    accent: "text-amber-400",
  },
]

export default function Documents() {
  const handleSubmitted = (task) => {
    // Persist the returned task so it appears in the Tasks page.
    addTask(task)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Documents</h2>
        <p className="mt-1 text-sm text-slate-400">
          Submit a document to the analysis pipeline and track its task.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DocumentUpload onSubmitted={handleSubmitted} />
        </div>

        {/* Pipeline info panel */}
        <div className="card h-fit p-6">
          <h3 className="text-sm font-semibold text-white">Analysis Pipeline</h3>
          <p className="mt-1 text-xs text-slate-500">
            Documents are processed asynchronously by independent agent workers,
            then aggregated into a final result.
          </p>

          <ul className="mt-5 space-y-4">
            {PIPELINE_NOTES.map((note) => (
              <li key={note.title} className="flex items-start gap-3">
                <note.icon size={18} className={`mt-0.5 shrink-0 ${note.accent}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">{note.title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{note.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
            <Clock size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <p>
              Task states are polled automatically every 2 seconds until the task
              reaches a terminal state (SUCCESS or FAILURE).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}