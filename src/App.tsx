import { Navigate, Route, Routes } from 'react-router-dom'
import { BackupModal } from './components/BackupModal'
import { EditMilestoneModal } from './components/EditMilestoneModal'
import { LoginModal } from './components/LoginModal'
import { HomePage } from './pages/HomePage'
import { ProjectPage } from './pages/ProjectPage'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { recoveryBanner, restorePreviousData, setRecoveryBanner } = useAppStore()

  return (
    <div className="app-shell">
      <div className="bg-waves" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      {recoveryBanner ? (
        <div
          className="auth-banner"
          style={{
            position: 'relative',
            zIndex: 10,
            marginTop: 12,
            borderColor: 'var(--accent)',
            background: 'var(--surface-elevated)',
          }}
        >
          <div>
            <strong>Found earlier saved data!</strong>
            <div style={{ fontSize: 11 }}>{recoveryBanner}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
              }}
              onClick={() => restorePreviousData()}
            >
              Restore
            </button>
            <button
              type="button"
              style={{ fontSize: 12, color: 'var(--text-muted)' }}
              onClick={() => setRecoveryBanner(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LoginModal />
      <EditMilestoneModal />
      <BackupModal />
    </div>
  )
}
