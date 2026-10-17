import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ProgressRing } from '../components/ProgressRing'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAppStore } from '../store/useAppStore'

export function HomePage() {
  const {
    projects,
    projectStats,
    isAuthenticated,
    setLoginOpen,
    logout,
    setBackupModalOpen,
    syncStatus,
  } = useAppStore()

  return (
    <div className="page">
      <header className="top-bar">
        <div className="greet">
          <h1>Dashboard</h1>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setBackupModalOpen(true)}
            title="Cloud Sync & Data Backup"
            aria-label="Cloud Sync & Data Backup"
            style={{ position: 'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
            <span
              style={{
                position: 'absolute',
                bottom: 5,
                right: 5,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor:
                  syncStatus === 'synced'
                    ? 'var(--success)'
                    : syncStatus === 'syncing'
                      ? 'var(--accent)'
                      : 'var(--warning)',
              }}
            />
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn login-btn"
            onClick={() => (isAuthenticated ? logout() : setLoginOpen(true))}
            aria-label={isAuthenticated ? 'Log out' : 'Login'}
            title={isAuthenticated ? 'Log out' : 'Login'}
          >
            {isAuthenticated ? <LogoutIcon /> : <LoginIcon />}
          </button>
        </div>
      </header>

      <section className="project-list" aria-label="Projects">
        {projects.map((project) => {
          const stats = projectStats(project.id)
          return (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className={`project-card project-card--${project.id}`}
              style={
                {
                  '--project-accent': project.accent,
                  '--project-accent-soft': project.accentSoft,
                } as CSSProperties
              }
            >
              <div className="project-card-top">
                <div>
                  <h2>{project.name}</h2>
                  <p>{project.tagline}</p>
                </div>
                <ProgressRing percent={stats.percent} size={54} stroke={5} className="mini-ring" />
              </div>
              <div className="project-card-bottom">
                <div>
                  <strong style={{ fontSize: 18 }}>{stats.percent}%</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {stats.completed}/{stats.total} done · {stats.pending + stats.inProgress} open
                    {stats.delayed ? ` · ${stats.delayed} delayed` : ''}
                  </div>
                </div>
                <span
                  className="pill"
                  style={{ background: project.accent, color: '#fff', border: 'none' }}
                >
                  Open
                </span>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

function LoginIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
