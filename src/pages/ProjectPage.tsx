import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AddMilestoneModal } from '../components/AddMilestoneModal'
import { ProgressRing } from '../components/ProgressRing'
import { ThemeToggle } from '../components/ThemeToggle'
import type { ProjectId } from '../types'
import { sortMilestonesByWeek, useAppStore } from '../store/useAppStore'

export function ProjectPage() {
  const { id } = useParams()
  const projectId = id as ProjectId
  const {
    getProject,
    projectStats,
    isAuthenticated,
    setEditingMilestone,
    setLoginOpen,
    logout,
    updateProjectDuration,
    removeMilestone,
    setBackupModalOpen,
    syncStatus,
  } = useAppStore()
  const project = getProject(projectId)
  const [durationDraft, setDurationDraft] = useState('')
  const [durationMsg, setDurationMsg] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (project) setDurationDraft(project.duration)
  }, [project?.id, project?.duration])

  if (!project) {
    return (
      <div className="page">
        <p className="empty-hint">Project not found.</p>
        <Link to="/" className="back-link">
          ← Back
        </Link>
      </div>
    )
  }

  const stats = projectStats(project.id)
  const sorted = sortMilestonesByWeek(project.milestones)

  const saveDuration = () => {
    const res = updateProjectDuration(project.id, durationDraft)
    setDurationMsg(res.ok ? 'Duration saved' : res.error ?? 'Could not save')
    if (res.ok) window.setTimeout(() => setDurationMsg(''), 1800)
  }

  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/" className="back-link">
          ← Back
        </Link>
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
            {isAuthenticated ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <section className="detail-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <h1>{project.name}</h1>
            <p className="meta">{project.tagline}</p>
            {isAuthenticated ? (
              <div className="duration-editor">
                <label htmlFor="project-duration">Duration</label>
                <div className="duration-row">
                  <input
                    id="project-duration"
                    value={durationDraft}
                    onChange={(e) => setDurationDraft(e.target.value)}
                    placeholder="e.g. 6 weeks"
                  />
                  <button type="button" className="edit-btn" onClick={saveDuration}>
                    Save
                  </button>
                </div>
                {durationMsg ? <span className="duration-msg">{durationMsg}</span> : null}
                <p className="meta" style={{ marginTop: 8 }}>
                  {project.teamHint}
                </p>
              </div>
            ) : (
              <p className="meta">
                {project.duration} · {project.teamHint}
              </p>
            )}
          </div>
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            <ProgressRing percent={stats.percent} size={88} stroke={7} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {stats.percent}%
            </div>
          </div>
        </div>
        <p className="meta" style={{ marginTop: 12 }}>
          <strong>End result:</strong> {project.endResult}
        </p>
      </section>

      <div className="stats-row">
        <div className="stat-card good">
          <div className="label">Completed</div>
          <div className="value">{stats.completed}</div>
        </div>
        <div className="stat-card warn">
          <div className="label">Pending / open</div>
          <div className="value">{stats.pending + stats.inProgress}</div>
        </div>
      </div>
      {stats.delayed > 0 ? (
        <div className="stat-card" style={{ marginBottom: 12 }}>
          <div className="label">Delayed</div>
          <div className="value" style={{ color: 'var(--danger)' }}>
            {stats.delayed}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Roadmap</h2>
        {isAuthenticated ? (
          <button type="button" className="edit-btn" onClick={() => setAddOpen(true)}>
            + Add milestone
          </button>
        ) : null}
      </div>

      <div className="roadmap">
        {sorted.map((m, idx) => (
          <article key={m.id} className="milestone">
            <div className="milestone-rail">
              <div className={`milestone-dot ${m.status}`} />
              {idx < sorted.length - 1 ? <div className="milestone-line" /> : null}
            </div>
            <div className="milestone-card">
              <header>
                <div>
                  <div className="week">{m.weekLabel}</div>
                  <h3>{m.title}</h3>
                </div>
                <span className={`status-chip ${m.status}`}>{m.status.replace('_', ' ')}</span>
              </header>
              <p className="theme">{m.theme}</p>
              <p className="theme" style={{ marginTop: 6 }}>
                <strong>Exit:</strong> {m.exitCriteria}
              </p>
              {m.status === 'completed' && m.achievementNote ? (
                <div className="note-box">
                  <strong>Achieved:</strong> {m.achievementNote}
                </div>
              ) : null}
              {m.status === 'delayed' && m.delayReason ? (
                <div className="note-box delay">
                  <strong>Delay:</strong> {m.delayReason}
                </div>
              ) : null}
              {m.updatedAt ? (
                <p className="theme" style={{ marginTop: 8, fontSize: 11 }}>
                  Updated {new Date(m.updatedAt).toLocaleString()}
                  {m.updatedBy ? ` · ${m.updatedBy}` : ''}
                </p>
              ) : null}
              {isAuthenticated ? (
                <div className="milestone-actions">
                  {m.status !== 'completed' ? (
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => setEditingMilestone(m.id)}
                    >
                      Mark completed
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="edit-btn ghost"
                    onClick={() => setEditingMilestone(m.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="edit-btn ghost danger-outline"
                    onClick={() => {
                      if (!window.confirm(`Remove “${m.title}”?`)) return
                      removeMilestone(project.id, m.id)
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <AddMilestoneModal
        projectId={project.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}
