import { useState } from "react"
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
 * loading / success / validation / API error states.
 */
export default function DocumentUpload({ onSubmitted }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [success, setSuccess] = useState(null)

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
  }

  // ---- Success state ----
  if (success) {
    return (
      <div className="card border-emerald-500/30 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Document submitted</h2>
            <p className="mt-1 text-sm text-slate-400">
              Task accepted onto the queue. Track its progress on the Tasks page.
            </p>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Task ID
              </p>
              <p className="mt-1 break-all font-mono text-sm font-medium text-cyan-300">
                {success.task_id}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Document: {success.document_id} · State:{" "}
                <span className="uppercase">{success.state || "PENDING"}</span>
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
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
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8" noValidate>
      <div className="flex items-center gap-2">
        <FileUp size={18} className="text-cyan-400" />
        <h2 className="text-base font-bold text-white">Submit Document</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        POST <span className="font-mono text-slate-400">{API_BASE_URL}/documents</span>
      </p>

      {/* API error banner */}
      {apiError && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Submission failed</p>
            <p className="mt-0.5 break-words">{apiError}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="document_id" className="label">
            Document ID
          </label>
          <input
            id="document_id"
            type="text"
            className={cn(
              "input",
              fieldErrors.document_id && "border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20"
            )}
            placeholder="INV-4471"
            value={form.document_id}
            onChange={(e) => setField("document_id", e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.document_id && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> {fieldErrors.document_id}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="content_type" className="label">
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
          <label htmlFor="source_uri" className="label">
            Source URI
          </label>
          <input
            id="source_uri"
            type="text"
            className={cn(
              "input font-mono text-[13px]",
              fieldErrors.source_uri && "border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20"
            )}
            placeholder="s3://bucket/invoice.png"
            value={form.source_uri}
            onChange={(e) => setField("source_uri", e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.source_uri && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> {fieldErrors.source_uri}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-slate-600">
            Where the document lives — s3://, file://, https://…
          </p>
        </div>

        <div className="md:col-span-2">
          <span className="label">Agents</span>
          <AgentSelector
            value={form.agents}
            onChange={(agents) => setField("agents", agents)}
          />
          {fieldErrors.agents && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> {fieldErrors.agents}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                Pipeline Processing
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                When enabled, OCR output is passed to downstream agents.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.pipeline}
              onClick={() => setField("pipeline", !form.pipeline)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full border transition",
                form.pipeline
                  ? "border-cyan-400 bg-cyan-400/90"
                  : "border-slate-600 bg-slate-800"
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all",
                  form.pipeline ? "left-[calc(100%-1.25rem)]" : "left-0.5"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-end gap-3">
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
              <Loader2 size={16} className="animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send size={16} /> Start Analysis
            </>
          )}
        </button>
      </div>
    </form>
  )
}