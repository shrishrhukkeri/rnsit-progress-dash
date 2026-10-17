import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAppStore } from '../store/useAppStore'

export function BackupModal() {
  const {
    backupModalOpen,
    setBackupModalOpen,
    exportBackup,
    importBackup,
    restorePreviousData,
    syncStatus,
    syncMessage,
    lastSyncedAt,
    projects,
  } = useAppStore()

  const [importText, setImportText] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showSeedCode, setShowSeedCode] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!backupModalOpen) return null

  const handleDownload = () => {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rnsit-progress-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setFeedback({ type: 'ok', text: 'Backup downloaded successfully!' })
  }

  const handleCopyBackup = async () => {
    try {
      const json = exportBackup()
      await navigator.clipboard.writeText(json)
      setFeedback({ type: 'ok', text: 'Backup JSON copied to clipboard!' })
    } catch {
      setFeedback({ type: 'err', text: 'Clipboard access denied' })
    }
  }

  const handleImportSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!importText.trim()) {
      setFeedback({ type: 'err', text: 'Please paste backup JSON first' })
      return
    }
    const res = importBackup(importText)
    if (res.ok) {
      setFeedback({ type: 'ok', text: 'Data imported and synced successfully!' })
      setImportText('')
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to import backup' })
    }
  }

  const handleRestorePrevious = () => {
    const res = restorePreviousData()
    setFeedback({ type: res.ok ? 'ok' : 'err', text: res.message })
  }

  const generateSeedTs = () => {
    return `export const seedProjects: Project[] = ${JSON.stringify(projects, null, 2)}\n`
  }

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(generateSeedTs())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="modal-backdrop" onClick={() => setBackupModalOpen(false)}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Cloud & Data Backup</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setBackupModalOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="sub" style={{ marginBottom: 12 }}>
          Your edits are saved locally and synced automatically to Render.
        </p>

        {/* Sync Status Banner */}
        <div
          className="auth-banner"
          style={{
            borderColor:
              syncStatus === 'synced'
                ? 'var(--success)'
                : syncStatus === 'syncing'
                  ? 'var(--accent)'
                  : 'var(--warning)',
          }}
        >
          <div>
            <strong
              style={{
                color:
                  syncStatus === 'synced'
                    ? 'var(--success)'
                    : syncStatus === 'syncing'
                      ? 'var(--accent)'
                      : 'var(--warning)',
              }}
            >
              ● {syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Saved in Browser'}
            </strong>
            <div style={{ fontSize: 11, marginTop: 2 }}>{syncMessage}</div>
            {lastSyncedAt ? (
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => useAppStore.getState().fetchServerState()}>
            Refresh
          </button>
        </div>

        {feedback ? (
          <p
            className={feedback.type === 'ok' ? 'duration-msg' : 'error'}
            style={{ margin: '8px 0 12px' }}
          >
            {feedback.text}
          </p>
        ) : null}

        {/* Restore Previous Session Button */}
        <div style={{ margin: '14px 0', padding: 12, borderRadius: 14, background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            Lost data from earlier session?
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
            If you made changes before the recent update, click below to scan and recover them from your browser.
          </p>
          <button
            type="button"
            className="btn ghost"
            style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
            onClick={handleRestorePrevious}
          >
            Scan & Recover Previous Browser Session
          </button>
        </div>

        {/* Export Options */}
        <div style={{ margin: '14px 0' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Export Backup</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn primary"
              style={{ padding: '10px 12px', fontSize: 13 }}
              onClick={handleDownload}
            >
              Download JSON
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{ padding: '10px 12px', fontSize: 13 }}
              onClick={handleCopyBackup}
            >
              Copy JSON
            </button>
          </div>
        </div>

        {/* Import Option */}
        <form onSubmit={handleImportSubmit} style={{ margin: '16px 0 10px' }}>
          <div className="field">
            <label htmlFor="import-box">Import / Restore Backup (Paste JSON)</label>
            <textarea
              id="import-box"
              rows={3}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste exported backup JSON here..."
              style={{ fontSize: 12, fontFamily: 'monospace' }}
            />
          </div>
          <button
            type="submit"
            className="btn ghost"
            style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
          >
            Apply & Restore Pasted Backup
          </button>
        </form>

        {/* Developer / Seed Export */}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
          <button
            type="button"
            className="btn ghost"
            style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
            onClick={() => setShowSeedCode(!showSeedCode)}
          >
            {showSeedCode ? 'Hide Permanent Seed Code' : 'Save permanently into Git (seed.ts code)'}
          </button>

          {showSeedCode ? (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Copy this snippet and replace <code>seedProjects</code> in <code>src/data/seed.ts</code>, then commit to GitHub. Your milestones will become the hardcoded default even if Render containers reset!
              </p>
              <textarea
                readOnly
                rows={6}
                value={generateSeedTs()}
                style={{
                  width: '100%',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  background: 'var(--input-bg)',
                  borderRadius: 10,
                  padding: 8,
                }}
              />
              <button
                type="button"
                className="btn primary"
                style={{ width: '100%', marginTop: 6, padding: '8px 12px', fontSize: 12 }}
                onClick={handleCopySeed}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy seed.ts Code'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
