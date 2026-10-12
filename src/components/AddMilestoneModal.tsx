import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ProjectId } from '../types'
import { useAppStore } from '../store/useAppStore'

type Props = {
  projectId: ProjectId
  open: boolean
  onClose: () => void
}

export function AddMilestoneModal({ projectId, open, onClose }: Props) {
  const { addMilestone, isAuthenticated } = useAppStore()
  const [title, setTitle] = useState('')
  const [weekLabel, setWeekLabel] = useState('')
  const [theme, setTheme] = useState('')
  const [exitCriteria, setExitCriteria] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setTitle('')
    setWeekLabel('')
    setTheme('')
    setExitCriteria('')
    setError('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      setError('Login required')
      return
    }
    const res = addMilestone(projectId, { title, weekLabel, theme, exitCriteria })
    if (!res.ok) {
      setError(res.error ?? 'Could not add milestone')
      return
    }
    reset()
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        reset()
        onClose()
      }}
    >
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <form onSubmit={onSubmit}>
          <h2>Add milestone</h2>
          <p className="sub">Extend the project timeline with a new phase.</p>
          {error ? <p className="error">{error}</p> : null}
          <div className="field">
            <label htmlFor="new-week">Week / phase</label>
            <input
              id="new-week"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              placeholder="e.g. Week 5 or Weeks 5–6"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-title">Title</label>
            <input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-theme">Theme (optional)</label>
            <input
              id="new-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Short focus line"
            />
          </div>
          <div className="field">
            <label htmlFor="new-exit">Exit criteria (optional)</label>
            <textarea
              id="new-exit"
              value={exitCriteria}
              onChange={(e) => setExitCriteria(e.target.value)}
              placeholder="What done looks like"
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Add to roadmap
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
