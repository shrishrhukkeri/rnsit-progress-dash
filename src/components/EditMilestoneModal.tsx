import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { MilestoneStatus, ProjectId } from '../types'
import { useAppStore } from '../store/useAppStore'

export function EditMilestoneModal() {
  const {
    editingMilestoneId,
    setEditingMilestone,
    projects,
    isAuthenticated,
    setLoginOpen,
    updateMilestone,
  } = useAppStore()

  const found = useMemo(() => {
    if (!editingMilestoneId) return null
    for (const p of projects) {
      const m = p.milestones.find((x) => x.id === editingMilestoneId)
      if (m) return { projectId: p.id as ProjectId, projectName: p.name, milestone: m }
    }
    return null
  }, [editingMilestoneId, projects])

  const [status, setStatus] = useState<MilestoneStatus>('pending')
  const [achievementNote, setAchievementNote] = useState('')
  const [delayReason, setDelayReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!found) return
    setStatus(found.milestone.status)
    setAchievementNote(found.milestone.achievementNote ?? '')
    setDelayReason(found.milestone.delayReason ?? '')
    setError('')
  }, [found])

  if (!editingMilestoneId || !found) return null

  if (!isAuthenticated) {
    return (
      <div className="modal-backdrop" onClick={() => setEditingMilestone(null)}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <h2>Login required</h2>
          <p className="sub">
            Faculty and supervisors can view progress freely. Students must log in to
            update milestones.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setEditingMilestone(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditingMilestone(null)
                setLoginOpen(true)
              }}
            >
              Student login
            </button>
          </div>
        </div>
      </div>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const res = updateMilestone(found.projectId, found.milestone.id, {
      status,
      achievementNote,
      delayReason,
    })
    if (!res.ok) setError(res.error ?? 'Could not save')
  }

  return (
    <div className="modal-backdrop" onClick={() => setEditingMilestone(null)}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <form onSubmit={onSubmit}>
          <h2>Update milestone</h2>
          <p className="sub">
            {found.projectName} · {found.milestone.weekLabel} — {found.milestone.title}
          </p>
          {error ? <p className="error">{error}</p> : null}
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed / achieved</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
          {status === 'completed' ? (
            <div className="field">
              <label htmlFor="achieved">What was achieved</label>
              <textarea
                id="achieved"
                value={achievementNote}
                onChange={(e) => setAchievementNote(e.target.value)}
                placeholder="Short description of the deliverable or demo outcome"
                required
              />
            </div>
          ) : null}
          {status === 'delayed' ? (
            <div className="field">
              <label htmlFor="delay">Reason for delay</label>
              <textarea
                id="delay"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Why this milestone slipped and the recovery plan"
                required
              />
            </div>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setEditingMilestone(null)}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Save update
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
