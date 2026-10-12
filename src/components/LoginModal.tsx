import { useState } from 'react'
import type { FormEvent } from 'react'
import { STUDENT_PASS, STUDENT_USER } from '../data/seed'
import { useAppStore } from '../store/useAppStore'

export function LoginModal() {
  const { loginOpen, setLoginOpen, isAuthenticated, login, logout, editorName } =
    useAppStore()
  const [username, setUsername] = useState(STUDENT_USER)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (!loginOpen) return null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const res = login(username, password)
    if (!res.ok) setError(res.error ?? 'Login failed')
    else {
      setError('')
      setPassword('')
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => setLoginOpen(false)}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {isAuthenticated ? (
          <>
            <h2>Editing unlocked</h2>
            <p className="sub">
              Signed in as <strong>{editorName}</strong>. Faculty can stay logged out for
              view-only. Students can update milestone status, delay reasons, and
              achievement notes.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setLoginOpen(false)}>
                Close
              </button>
              <button type="button" className="btn primary" onClick={logout}>
                Log out
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <h2>Student login</h2>
            <p className="sub">
              Viewers need no account. Login only to mark milestones. Demo:{' '}
              <code>{STUDENT_USER}</code> / <code>{STUDENT_PASS}</code>
            </p>
            {error ? <p className="error">{error}</p> : null}
            <div className="field">
              <label htmlFor="user">Username</label>
              <input
                id="user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="pass">Password</label>
              <input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setLoginOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Unlock edits
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
