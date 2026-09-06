import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  FileText,
  GitMerge,
  Radar,
  ScanText,
  ShieldCheck,
  Workflow,
} from "lucide-react"
import { cn } from "../../utils/cn"

function Node({ icon: Icon, label, sublabel, accent }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-slate-900 px-4 py-3",
        accent
      )}
    >
      <Icon size={18} className="shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        {sublabel && (
          <p className="truncate text-[11px] text-slate-500">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

function Connector() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-4 w-px bg-slate-700/80" />
      <ChevronDown size={14} className="-mt-1 text-slate-600" />
    </div>
  )
}

/**
 * Static visualization of the async processing pipeline:
 * Document → OCR → Compliance + Anomaly (parallel) → Aggregate → Final Result.
 */
export default function WorkflowOverview() {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Workflow size={16} className="text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Async Processing Pipeline</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Documents are processed asynchronously through independent agent workers.
      </p>

      <div className="mt-6 flex flex-col items-center">
        <Node
          icon={FileText}
          label="Document"
          sublabel="Submitted via API"
          accent="border-slate-700 text-slate-200"
        />
        <Connector />
        <Node
          icon={ScanText}
          label="OCR Agent"
          sublabel="Text extraction"
          accent="border-cyan-500/30 text-cyan-400"
        />
        <Connector />

        {/* Parallel branch */}
        <div className="w-full">
          <div className="hidden h-4 items-center justify-center sm:flex">
            <div className="relative w-[calc(100%-3rem)]">
              <div className="h-px w-full bg-slate-700/80" />
              <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-700/80" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-8">
            <Node
              icon={ShieldCheck}
              label="Compliance Agent"
              sublabel="Policy & compliance checks"
              accent="border-violet-500/30 text-violet-400"
            />
            <Node
              icon={Radar}
              label="Anomaly Detection"
              sublabel="Suspicious pattern analysis"
              accent="border-fuchsia-500/30 text-fuchsia-400"
            />
          </div>
        </div>

        <Connector />
        <Node
          icon={GitMerge}
          label="Aggregate"
          sublabel="Merge agent results"
          accent="border-amber-500/30 text-amber-400"
        />
        <Connector />
        <Node
          icon={CheckCircle2}
          label="Final Result"
          sublabel="Task completed"
          accent="border-emerald-500/30 text-emerald-400"
        />

        <div className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-xs text-slate-400">
          <Boxes size={14} className="shrink-0 text-slate-500" />
          Independent agent workers consume from dedicated queues, then results are
          aggregated asynchronously.
        </div>
      </div>
    </div>
  )
}