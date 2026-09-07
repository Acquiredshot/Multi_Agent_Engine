import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Send,
  XCircle,
} from "lucide-react"
import AgentSelector from "./AgentSelector"
import { submitDocument, API_BASE_URL } from "../../services/api"
import { cn } from "../../utils/cn"

const INITIAL_FORM = {
  document_id: "",
  source_uri: "",
  content_type: "application/pdf",
  agents: ["ocr", "compliance", "anomaly"],
  pipeline: true,
}

/**
 * Document submission form. Posts to POST /documents and surfaces
 * loading (with simulated upload progress) / success / validation /
 * API error states.
 */
export default function DocumentUpload({ onSubmitted }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [apiError, setApiError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fake-but-honest progress: fills while awaiting the API response.
  useEffect(() => {
    if (!submitting) return undefined
    const timer = setInterval(() => {
      setProgress((p) => (p < 8 ? 8 : p < 90 ? p + Math.max(1, (90 - p) * 0.08) : p))
    }, 120)
    return () => clearInterval(timer)
  }, [submitting])

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    setFieldErrors((e) => ({ ...e, [name]: undefined }))
    setApiError(null)
  }

  const validate = () => {
    const errors = {}
    if (!form.document_id.trim()) {
      errors.document_id = "Document ID is required."
    } else if (form.document_id.trim().length > 128) {
      errors.document_id = "Document ID must be 128 characters or fewer."
    }
    if (!form.source_uri.trim()) {
      errors.source_uri = "Source URI is required."
    }
    if (!form.agents.length) {
      errors.agents = "Select at least one agent."
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setApiError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const task = await submitDocument({
        document_id: form.document_id.trim(),
        source_uri: form.source_uri.trim(),
        content_type: form.content_type.trim() || "application/pdf",
        agents: form.agents,
        pipeline: form.pipeline,
      })
      setProgress(100)
      setSuccess(task)
      onSubmitted?.(task)
    } catch (err) {
      setApiError(err.message || "Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setForm(INITIAL_FORM)
    setSuccess(null)
    setApiError(null)
    setFieldErrors({})
    setProgress(0)
  }

  // ---- Success state ----
  if (success) {
    return (
      <div className="panel border-emerald-500/25 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-100">Document submitted</h2>
            <p className="mt-1 text-xs text-slate-500">
              Task accepted onto the queue. Track its progress below or on the Tasks page.
            </p>
            <div className="mt-3 rounded border border-ink-700/70 bg-ink-950/70 p-3.5">
              <p className="tlabel">Task ID</p>
              <p className="mt-1 break-all font-mono text-sm font-medium text-emerald-300">
                {success.task_id}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Document: <span className="font-mono text-slate-400">{success.document_id}</span> · State:{" "}
                <span className="font-mono uppercase text-slate-400">{success.state || "PENDING"}</span>
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  navigate(`/tasks?task=${encodeURIComponent(success.task_id)}`)
                }
              >
                View Task
              </button>
              <button type="button" className="btn-secondary" onClick={reset}>
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Form state ----
  return (
    <form onSubmit={handleSubmit} className="panel p-5 sm:p-6" noValidate>
      <div className="flex items-center gap-2">
        <FileUp size={16} className="text-emerald-400" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Submit Document
        </h2>
      </div>
      <p className="mt-1 font-mono text-[11px] text-slate-600">
        POST {API_BASE_URL}/documents
      </p>

      {/* API error banner */}
      {apiError && (
        <div className="mt-4 flex items-start gap-3 rounded border border-red-500/25 bg-red-500/[0.06] p-3.5 text-sm text-red-300">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Submission failed</p>
            <p className="mt-0.5 break-words text-xs">{apiError}</p>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {submitting && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin text-emerald-400" />
              Dispatching task…
            </span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-emerald-400/70 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="document_id" className="tlabel mb-1.5 block">
            Document ID
          </label>
          <input
            id="document_id"
            type="text"
            className={cn(
              "input",
              fieldErrors.document_id && "border-red-500/50 focus:border-red-500/60"
            )}
            placeholder="INV-4471"
            value={form.document_id}
            onChange={(e) => setField("document_id", e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.document_id && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
              <AlertCircle size={11} /> {fieldErrors.document_id}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="content_type" className="tlabel mb-1.5 block">
            Content Type
          </label>
          <input
            id="content_type"
            type="text"
            list="content-type-options"
            className="input"
            placeholder="application/pdf"
            value={form.content_type}
            onChange={(e) => setField("content_type", e.target.value)}
            disabled={submitting}
          />
          <datalist id="content-type-options">
            <option value="application/pdf" />
            <option value="image/png" />
            <option value="image/jpeg" />
            <option value="text/plain" />
          </datalist>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="source_uri" className="tlabel mb-1.5 block">
            Source URI
          </label>
          <input
            id="source_uri"
            type="text"
            className={cn(
              "input font-mono text-[13px]",
              fieldErrors.source_uri && "border-red-500/50 focus:border-red-500/60"
            )}
            placeholder="s3://bucket/invoice.png"
            value={form.source_uri}
            onChange={(e) => setField("source_uri", e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.source_uri && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
              <AlertCircle size={11} /> {fieldErrors.source_uri}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-slate-600">
            Where the document lives — s3://, file://, https://…
          </p>
        </div>

        <div className="md:col-span-2">
          <span className="tlabel mb-1.5 block">Agents</span>
          <AgentSelector
            value={form.agents}
            onChange={(agents) => setField("agents", agents)}
          />
          {fieldErrors.agents && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
              <AlertCircle size={11} /> {fieldErrors.agents}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-start justify-between gap-4 rounded border border-ink-700/70 bg-ink-950/50 p-3.5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-200">
                Pipeline Mode
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                When enabled, OCR output is passed to downstream agents before
                aggregation (backend <span className="font-mono">pipeline: true</span>).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.pipeline}
              onClick={() => setField("pipeline", !form.pipeline)}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full border transition",
                form.pipeline ? "border-emerald-400/70 bg-emerald-400/80" : "border-slate-600 bg-ink-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-ink-950 shadow transition-all",
                  form.pipeline ? "left-[calc(100%-1rem)]" : "left-0.5"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-ink-700/60 pt-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={reset}
          disabled={submitting}
        >
          Reset
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send size={15} /> Start Processing
            </>
          )}
        </button>
      </div>
    </form>
  )
}
