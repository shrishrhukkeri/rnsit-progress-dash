import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Milestone, MilestoneStatus, Project, ProjectId } from '../types'
import { STUDENT_PASS, STUDENT_USER, seedProjects } from '../data/seed'

type ThemeMode = 'light' | 'dark'

type MilestonePatch = Partial<
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

type NewMilestoneInput = {
  title: string
  theme?: string
  weekLabel: string
  exitCriteria?: string
}

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
}

function applyHtmlTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121212' : '#4B7BFF')
}

/** Keep brand/meta from seed; prefer saved duration + full milestone list (team edits). */
function mergeProjectsWithSeed(saved: Project[] | undefined): Project[] {
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

      updateProjectDuration: (projectId, duration) => {
        const blocked = requireAuth(get)
        if (blocked) return blocked
        const next = duration.trim()
        if (!next) return { ok: false, error: 'Duration cannot be empty' }

        set({
          projects: get().projects.map((p) =>
            p.id === projectId ? { ...p, duration: next } : p,
          ),
        })
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

        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, milestones: [...p.milestones, milestone] }
              : p,
          ),
        })
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

        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p
            const remaining = p.milestones
              .filter((m) => m.id !== milestoneId)
              .map((m, i) => ({ ...m, order: i + 1 }))
            return { ...p, milestones: remaining }
          }),
          editingMilestoneId:
            get().editingMilestoneId === milestoneId ? null : get().editingMilestoneId,
        })
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
      name: 'rnsit-progress-dash-v2',
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
