import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Milestone, MilestoneStatus, Project, ProjectId } from '../types'
import { STUDENT_PASS, STUDENT_USER, seedProjects } from '../data/seed'

type ThemeMode = 'light' | 'dark'

type AppState = {
  theme: ThemeMode
  isAuthenticated: boolean
  editorName: string
  projects: Project[]
  loginOpen: boolean
  editingMilestoneId: string | null
  toggleTheme: () => void
  setLoginOpen: (open: boolean) => void
  setEditingMilestone: (id: string | null) => void
  login: (username: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  updateMilestone: (
    projectId: ProjectId,
    milestoneId: string,
    patch: Partial<Pick<Milestone, 'status' | 'achievementNote' | 'delayReason'>>,
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
}

function applyHtmlTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121212' : '#4B7BFF')
}

function mergeProjectsWithSeed(saved: Project[] | undefined): Project[] {
  return seedProjects.map((seed) => {
    const existing = saved?.find((p) => p.id === seed.id)
    if (!existing) return structuredClone(seed)
    return {
      ...seed,
      milestones: seed.milestones.map((sm) => {
        const em = existing.milestones.find((m) => m.id === sm.id)
        return em ? { ...sm, ...em, title: sm.title, theme: sm.theme, weekLabel: sm.weekLabel, exitCriteria: sm.exitCriteria, order: sm.order } : sm
      }),
    }
  })
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

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        applyHtmlTheme(next)
        set({ theme: next })
      },

      setLoginOpen: (open) => set({ loginOpen: open }),
      setEditingMilestone: (id) => set({ editingMilestoneId: id }),

      login: (username, password) => {
        if (username.trim().toLowerCase() === STUDENT_USER && password === STUDENT_PASS) {
          set({ isAuthenticated: true, editorName: 'Student Team', loginOpen: false })
          return { ok: true }
        }
        return { ok: false, error: 'Invalid student credentials' }
      },

      logout: () => set({ isAuthenticated: false, editorName: '', editingMilestoneId: null }),

      updateMilestone: (projectId, milestoneId, patch) => {
        if (!get().isAuthenticated) {
          return { ok: false, error: 'Login required to edit milestones' }
        }

        if (patch.status === 'delayed' && !patch.delayReason?.trim()) {
          return { ok: false, error: 'Delay reason is required when a milestone is delayed' }
        }
        if (patch.status === 'completed' && !patch.achievementNote?.trim()) {
          return { ok: false, error: 'Add a short description of what was achieved' }
        }

        const now = new Date().toISOString()
        const editor = get().editorName || 'Student'

        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p
            return {
              ...p,
              milestones: p.milestones.map((m) => {
                if (m.id !== milestoneId) return m
                const nextStatus = (patch.status ?? m.status) as MilestoneStatus
                return {
                  ...m,
                  ...patch,
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
          }),
          editingMilestoneId: null,
        })
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
    }),
    {
      name: 'rnsit-progress-dash',
      partialize: (s) => ({
        theme: s.theme,
        isAuthenticated: s.isAuthenticated,
        editorName: s.editorName,
        projects: s.projects,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined
        return {
          ...current,
          ...p,
          projects: mergeProjectsWithSeed(p?.projects),
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyHtmlTheme(state.theme)
        else applyHtmlTheme('light')
      },
    },
  ),
)
