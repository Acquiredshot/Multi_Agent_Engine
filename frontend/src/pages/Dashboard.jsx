import { useNavigate } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
} from "lucide-react"
import StatCard from "../components/dashboard/StatCard"
import AgentCard from "../components/dashboard/AgentCard"
import RecentTasks from "../components/dashboard/RecentTasks"
import WorkflowOverview from "../components/dashboard/WorkflowOverview"
import { dashboardStats, agentStatuses } from "../data/demoData"

const STAT_ICONS = {
  total: FileText,
  processing: Activity,
  completed: CheckCircle2,
  failed: AlertTriangle,
}

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Document Intelligence Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Monitor document processing, agent activity and workflow results.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => navigate("/documents")}
        >
          <Plus size={16} strokeWidth={2.5} /> Upload Document
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.id}
            icon={STAT_ICONS[stat.id] || FileText}
            label={stat.label}
            value={stat.value}
            accent={stat.accent}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Agent status */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Agent Status
          </h2>
          <span className="h-px flex-1 bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agentStatuses.map((agent) => (
            <AgentCard key={agent.key} agent={agent} />
          ))}
        </div>
      </section>

      {/* Workflow + recent tasks */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <WorkflowOverview />
        </div>
        <div className="xl:col-span-3">
          <RecentTasks />
        </div>
      </div>
    </div>
  )
}