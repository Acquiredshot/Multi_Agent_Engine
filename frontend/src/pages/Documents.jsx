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
    <div className="space-y-3.5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Documents</h2>
        <p className="text-[11px] text-slate-500">
          Submit a document to the processing pipeline and track its task
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DocumentUpload onSubmitted={handleSubmitted} />
        </div>

        {/* Pipeline info panel */}
        <div className="panel h-fit p-4">
          <h3 className="tlabel text-slate-400">Analysis Pipeline</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Documents are processed asynchronously by independent agent workers,
            then aggregated into a final result.
          </p>

          <ul className="mt-4 space-y-3.5 border-t border-ink-700/60 pt-4">
            {PIPELINE_NOTES.map((note) => (
              <li key={note.title} className="flex items-start gap-3">
                <note.icon size={16} className={`mt-0.5 shrink-0 ${note.accent}`} />
                <div>
                  <p className="text-[13px] font-semibold text-slate-200">{note.title}</p>
                  <p className="text-[11px] leading-relaxed text-slate-500">{note.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-start gap-2.5 rounded border border-ink-700/70 bg-ink-850 p-3 text-[11px] leading-relaxed text-slate-500">
            <Clock size={13} className="mt-0.5 shrink-0 text-slate-600" />
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
