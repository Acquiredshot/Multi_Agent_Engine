import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import DashboardLayout from "./components/layout/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import Documents from "./pages/Documents"
import Tasks from "./pages/Tasks"
import TaskDetails from "./pages/TaskDetails"
import Agents from "./pages/Agents"
import SystemHealth from "./pages/SystemHealth"
import Monitoring from "./pages/Monitoring"
import Settings from "./pages/Settings"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:taskId" element={<TaskDetails />} />
          <Route path="agents" element={<Agents />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
