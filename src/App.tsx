import { Navigate, Route, Routes } from 'react-router-dom'
import { EditMilestoneModal } from './components/EditMilestoneModal'
import { LoginModal } from './components/LoginModal'
import { HomePage } from './pages/HomePage'
import { ProjectPage } from './pages/ProjectPage'

export default function App() {
  return (
    <div className="app-shell">
      <div className="bg-waves" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LoginModal />
      <EditMilestoneModal />
    </div>
  )
}
