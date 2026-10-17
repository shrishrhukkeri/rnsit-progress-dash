import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Milestone, MilestoneStatus, Project, ProjectId } from '../types'
import { STUDENT_PASS, STUDENT_USER, seedProjects } from '../data/seed'

export type ThemeMode = 'light' | 'dark'
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export type MilestonePatch = Partial<
  Pick<
    Milestone,
    | 'status'
    | 'achievementNote'
    | 'delayReason'
    | 'title'
    | 'theme'
    | 'weekLabel'
    | 'exitCriteria'
    | 'order'
  >
>

export type NewMilestoneInput = {
  title: string
  theme?: string
  weekLabel: string
  exitCriteria?: string
}

export type AppState = {
  theme: ThemeMode
  isAuthenticated: boolean
  editorName: string
  projects: Project[]
  loginOpen: boolean
  editingMilestoneId: string | null
  backupModalOpen: boolean
  syncStatus: SyncStatus
  syncMessage: string
  lastSyncedAt: string | null
  recoveryBanner: string | null

  toggleTheme: () => void
  setLoginOpen: (open: boolean) => void
  setEditingMilestone: (id: string | null) => void
  setBackupModalOpen: (open: boolean) => void
  setRecoveryBanner: (msg: string | null) => void
  setSyncStatus: (status: SyncStatus, msg: string) => void

  login: (username: string, password: string) => { ok: boolean; error?: string }
  logout: () => void

  updateProjectDuration: (projectId: ProjectId, duration: string) => { ok: boolean; error?: string }
  addMilestone: (
    projectId: ProjectId,
    input: NewMilestoneInput,
  ) => { ok: boolean; error?: string; id?: string }
  removeMilestone: (projectId: ProjectId, milestoneId: string) => { ok: boolean; error?: string }
  updateMilestone: (
    projectId: ProjectId,
    milestoneId: string,
    patch: MilestonePatch,
  ) => { ok: boolean; error?: string }

  getProject: (id: ProjectId) => Project | undefined
  projectStats: (id: ProjectId) => {
    total: number
    completed: number
    pending: number
    inProgress: number
    delayed: number
    percent: number
  }
  overallPercent: () => number

  syncToServer: () => Promise<void>
  fetchServerState: () => Promise<void>
  exportBackup: () => string
  importBackup: (jsonText: string) => { ok: boolean; error?: string }
  restorePreviousData: () => { ok: boolean; message: string }
  resetToDefaultSeed: () => Promise<{ ok: boolean }>
}

function applyHtmlTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121212' : '#4B7BFF')
}

export function hasUserEdits(projects?: Project[] | null): boolean {
  if (!projects || !Array.isArray(projects) || projects.length === 0) return false
  for (const p of projects) {
    if (!p || !Array.isArray(p.milestones)) continue
    const seed = seedProjects.find((s) => s.id === p.id)
    if (seed && p.duration && p.duration.trim() !== seed.duration.trim()) return true
    if (seed && p.milestones.length !== seed.milestones.length) return true
    for (const m of p.milestones) {
      if (m.status && m.status !== 'pending') return true
      if (m.achievementNote && m.achievementNote.trim()) return true
      if (m.delayReason && m.delayReason.trim()) return true
      if (m.id && m.id.includes('-custom-')) return true
      if (m.updatedAt) return true
      if (seed) {
        const sm = seed.milestones.find((s) => s.id === m.id)
        if (
          sm &&
          (sm.title !== m.title ||
            sm.weekLabel !== m.weekLabel ||
            sm.exitCriteria !== m.exitCriteria)
        ) {
          return true
        }
      }
    }
  }
  return false
}

export function mergeProjectsWithSeed(saved: Project[] | undefined): Project[] {
  return seedProjects.map((seed) => {
    const existing = saved?.find((p) => p.id === seed.id)
    if (!existing) return structuredClone(seed)
    const milestones =
      existing.milestones?.length > 0
        ? existing.milestones.map((m, i) => ({
            ...m,
            order: typeof m.order === 'number' ? m.order : i + 1,
          }))
        : structuredClone(seed.milestones)
    return {
      ...seed,
      duration: existing.duration?.trim() ? existing.duration : seed.duration,
      teamHint: existing.teamHint?.trim() ? existing.teamHint : seed.teamHint,
      endResult: existing.endResult?.trim() ? existing.endResult : seed.endResult,
      milestones,
    }
  })
}

function requireAuth(get: () => AppState) {
  if (!get().isAuthenticated) {
    return { ok: false as const, error: 'Login required to edit the timeline' }
  }
  return null
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null

function triggerSave(projects: Project[], set: any) {
  if (typeof window === 'undefined') return

  // 1. Save redundant backup directly to localStorage
  try {
    window.localStorage.setItem('rnsit-progress-dash-backup', JSON.stringify(projects))
    window.localStorage.setItem('rnsit-progress-dash-backup-time', new Date().toISOString())
  } catch (err) {
    console.warn('Backup localStorage write error:', err)
  }

  // 2. Debounced save to server
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  set({ syncStatus: 'syncing', syncMessage: 'Saving changes to cloud...' })

  syncDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects }),
      })
      if (res.ok) {
        const json = await res.json()
        set({
          syncStatus: 'synced',
          syncMessage: 'Saved & synced',
          lastSyncedAt: json.savedAt || new Date().toISOString(),
        })
      } else {
        set({
          syncStatus: 'error',
          syncMessage: 'Saved locally (server sync pending)',
        })
      }
    } catch {
      set({
        syncStatus: 'error',
        syncMessage: 'Saved locally (offline mode)',
      })
    }
  }, 300)
}

function detectLegacyData(): Project[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    // Check old v1 key
    const v1 = window.localStorage.getItem('rnsit-progress-dash')
    if (v1) {
      const parsed = JSON.parse(v1)
      const list = parsed?.state?.projects || parsed?.projects
      if (hasUserEdits(list)) return list
    }
    // Check backup key
    const bak = window.localStorage.getItem('rnsit-progress-dash-backup')
    if (bak) {
      const parsed = JSON.parse(bak)
      const list = parsed?.projects || (Array.isArray(parsed) ? parsed : null)
      if (hasUserEdits(list)) return list
    }
  } catch (err) {
    console.warn('Error reading legacy storage:', err)
  }
  return null
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      isAuthenticated: false,
      editorName: '',
      projects: mergeProjectsWithSeed(undefined),
      loginOpen: false,
      editingMilestoneId: null,
      backupModalOpen: false,
      syncStatus: 'idle',
      syncMessage: 'Local',
      lastSyncedAt: null,
      recoveryBanner: null,

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        applyHtmlTheme(next)
        set({ theme: next })
      },

      setLoginOpen: (open) => set({ loginOpen: open }),
      setEditingMilestone: (id) => set({ editingMilestoneId: id }),
      setBackupModalOpen: (open) => set({ backupModalOpen: open }),
      setRecoveryBanner: (msg) => set({ recoveryBanner: msg }),
      setSyncStatus: (status, msg) => set({ syncStatus: status, syncMessage: msg }),

      login: (username, password) => {
        if (username.trim().toLowerCase() === STUDENT_USER && password === STUDENT_PASS) {
          set({ isAuthenticated: true, editorName: 'Student Team', loginOpen: false })
          return { ok: true }
        }
        return { ok: false, error: 'Invalid student credentials' }
      },

      logout: () => set({ isAuthenticated: false, editorName: '', editingMilestoneId: null }),

      updateProjectDuration: (projectId, duration) => {
        const blocked = requireAuth(get)
        if (blocked) return blocked
        const next = duration.trim()
        if (!next) return { ok: false, error: 'Duration cannot be empty' }

        const nextProjects = get().projects.map((p) =>
          p.id === projectId ? { ...p, duration: next } : p,
        )
        set({ projects: nextProjects })
        triggerSave(nextProjects, set)
        return { ok: true }
      },

      addMilestone: (projectId, input) => {
        const blocked = requireAuth(get)
        if (blocked) return blocked

        const title = input.title.trim()
        const weekLabel = input.weekLabel.trim()
        if (!title) return { ok: false, error: 'Title is required' }
        if (!weekLabel) return { ok: false, error: 'Week / phase label is required' }

        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project not found' }

        const now = new Date().toISOString()
        const order =
          project.milestones.reduce((max, m) => Math.max(max, m.order), 0) + 1
        const id = `${projectId}-custom-${Date.now().toString(36)}`

        const milestone: Milestone = {
          id,
          title,
          theme: input.theme?.trim() || 'Team-added milestone',
          weekLabel,
          order,
          status: 'pending',
          exitCriteria: input.exitCriteria?.trim() || 'Define exit criteria with the team',
          updatedAt: now,
          updatedBy: get().editorName || 'Student',
        }

        const nextProjects = get().projects.map((p) =>
          p.id === projectId
            ? { ...p, milestones: [...p.milestones, milestone] }
            : p,
        )
        set({ projects: nextProjects })
        triggerSave(nextProjects, set)
        return { ok: true, id }
      },

      removeMilestone: (projectId, milestoneId) => {
        const blocked = requireAuth(get)
        if (blocked) return blocked

        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project not found' }
        if (project.milestones.length <= 1) {
          return { ok: false, error: 'Keep at least one milestone on the timeline' }
        }

        const nextProjects = get().projects.map((p) => {
          if (p.id !== projectId) return p
          const remaining = p.milestones
            .filter((m) => m.id !== milestoneId)
            .map((m, i) => ({ ...m, order: i + 1 }))
          return { ...p, milestones: remaining }
        })

        set({
          projects: nextProjects,
          editingMilestoneId:
            get().editingMilestoneId === milestoneId ? null : get().editingMilestoneId,
        })
        triggerSave(nextProjects, set)
        return { ok: true }
      },

      updateMilestone: (projectId, milestoneId, patch) => {
        const blocked = requireAuth(get)
        if (blocked) return blocked

        if (patch.status === 'delayed' && !patch.delayReason?.trim()) {
          return { ok: false, error: 'Delay reason is required when a milestone is delayed' }
        }
        if (patch.status === 'completed' && !patch.achievementNote?.trim()) {
          return { ok: false, error: 'Add a short description of what was achieved' }
        }
        if (patch.title !== undefined && !patch.title.trim()) {
          return { ok: false, error: 'Title cannot be empty' }
        }
        if (patch.weekLabel !== undefined && !patch.weekLabel.trim()) {
          return { ok: false, error: 'Week label cannot be empty' }
        }

        const now = new Date().toISOString()
        const editor = get().editorName || 'Student'

        const nextProjects = get().projects.map((p) => {
          if (p.id !== projectId) return p
          return {
            ...p,
            milestones: p.milestones.map((m) => {
              if (m.id !== milestoneId) return m
              const nextStatus = (patch.status ?? m.status) as MilestoneStatus
              return {
                ...m,
                ...patch,
                title: patch.title?.trim() ?? m.title,
                theme: patch.theme?.trim() ?? m.theme,
                weekLabel: patch.weekLabel?.trim() ?? m.weekLabel,
                exitCriteria: patch.exitCriteria?.trim() ?? m.exitCriteria,
                status: nextStatus,
                delayReason:
                  nextStatus === 'delayed'
                    ? patch.delayReason ?? m.delayReason
                    : nextStatus === 'completed'
                      ? undefined
                      : patch.delayReason ?? m.delayReason,
                achievementNote:
                  nextStatus === 'completed'
                    ? patch.achievementNote ?? m.achievementNote
                    : patch.achievementNote ?? m.achievementNote,
                updatedAt: now,
                updatedBy: editor,
              }
            }),
          }
        })

        set({
          projects: nextProjects,
          editingMilestoneId: null,
        })
        triggerSave(nextProjects, set)
        return { ok: true }
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      projectStats: (id) => {
        const project = get().projects.find((p) => p.id === id)
        const milestones = project?.milestones ?? []
        const total = milestones.length
        const completed = milestones.filter((m) => m.status === 'completed').length
        const pending = milestones.filter((m) => m.status === 'pending').length
        const inProgress = milestones.filter((m) => m.status === 'in_progress').length
        const delayed = milestones.filter((m) => m.status === 'delayed').length
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
        return { total, completed, pending, inProgress, delayed, percent }
      },

      overallPercent: () => {
        const all = get().projects.flatMap((p) => p.milestones)
        if (!all.length) return 0
        return Math.round((all.filter((m) => m.status === 'completed').length / all.length) * 100)
      },

      syncToServer: async () => {
        const projects = get().projects
        triggerSave(projects, set)
      },

      fetchServerState: async () => {
        try {
          set({ syncStatus: 'syncing', syncMessage: 'Checking cloud sync...' })
          const res = await fetch('/api/state')
          if (!res.ok) {
            set({ syncStatus: 'error', syncMessage: 'Offline' })
            return
          }
          const data = await res.json()
          const serverProjects = data?.projects

          const localHasEdits = hasUserEdits(get().projects)
          const serverHasEdits = hasUserEdits(serverProjects)

          if (serverHasEdits) {
            // Server has real user edits: merge into local store
            const merged = mergeProjectsWithSeed(serverProjects)
            set({
              projects: merged,
              syncStatus: 'synced',
              syncMessage: 'Synced with cloud',
              lastSyncedAt: data.updatedAt || new Date().toISOString(),
            })
            try {
              window.localStorage.setItem('rnsit-progress-dash-backup', JSON.stringify(merged))
            } catch {}
          } else if (localHasEdits && (!serverProjects || data.isDefault)) {
            // Local has edits, but server was freshly restarted: push local to server!
            console.log('Pushing local edits to server after server restart')
            triggerSave(get().projects, set)
          } else {
            set({
              syncStatus: 'synced',
              syncMessage: 'Synced',
              lastSyncedAt: data.updatedAt || new Date().toISOString(),
            })
          }
        } catch (err) {
          console.warn('fetchServerState error:', err)
          set({ syncStatus: 'error', syncMessage: 'Offline mode' })
        }
      },

      exportBackup: () => {
        const payload = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          projects: get().projects,
        }
        return JSON.stringify(payload, null, 2)
      },

      importBackup: (jsonText: string) => {
        try {
          const parsed = JSON.parse(jsonText)
          const projects = Array.isArray(parsed) ? parsed : parsed.projects
          if (!Array.isArray(projects) || projects.length === 0) {
            return { ok: false, error: 'Invalid backup: projects array not found' }
          }
          const merged = mergeProjectsWithSeed(projects)
          set({ projects: merged })
          triggerSave(merged, set)
          return { ok: true }
        } catch (err: any) {
          return { ok: false, error: err.message || 'Failed to parse JSON backup' }
        }
      },

      restorePreviousData: () => {
        const legacy = detectLegacyData()
        if (!legacy || legacy.length === 0) {
          return { ok: false, message: 'No earlier saved progress found in this browser.' }
        }
        const merged = mergeProjectsWithSeed(legacy)
        set({ projects: merged, recoveryBanner: null })
        triggerSave(merged, set)
        return { ok: true, message: 'Successfully recovered your previous progress!' }
      },

      resetToDefaultSeed: async () => {
        const fresh = mergeProjectsWithSeed(undefined)
        set({ projects: fresh, recoveryBanner: null })
        triggerSave(fresh, set)
        try {
          await fetch('/api/reset', { method: 'POST' })
        } catch {}
        return { ok: true }
      },
    }),
    {
      name: 'rnsit-progress-dash-v2',
      partialize: (s) => ({
        theme: s.theme,
        isAuthenticated: s.isAuthenticated,
        editorName: s.editorName,
        projects: s.projects,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined
        const currentEdits = hasUserEdits(p?.projects)
        let projectsToUse = p?.projects

        // If current v2 doesn't have edits, attempt to recover from v1!
        if (!currentEdits) {
          const legacy = detectLegacyData()
          if (legacy) {
            console.log('Auto-recovering legacy user edits into v2 store!')
            projectsToUse = legacy
          }
        }

        const mergedProjects = mergeProjectsWithSeed(projectsToUse)

        return {
          ...current,
          ...p,
          projects: mergedProjects,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyHtmlTheme(state.theme)
        else applyHtmlTheme('light')

        // Check if legacy data exists and inform user
        const legacy = detectLegacyData()
        if (legacy && !hasUserEdits(state?.projects)) {
          state?.setRecoveryBanner('Found your previous session data! Click here to restore.')
        }

        // Trigger background cloud sync on app start
        setTimeout(() => {
          state?.fetchServerState()
        }, 100)
      },
    },
  ),
)
