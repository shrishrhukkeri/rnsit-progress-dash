export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed'

export type Milestone = {
  id: string
  title: string
  theme: string
  weekLabel: string
  order: number
  status: MilestoneStatus
  exitCriteria: string
  achievementNote?: string
  delayReason?: string
  updatedAt?: string
  updatedBy?: string
}

export type ProjectId = 'nexa' | 'concierge' | 'varchlearn'

export type Project = {
  id: ProjectId
  name: string
  shortName: string
  tagline: string
  duration: string
  teamHint: string
  accent: string
  accentSoft: string
  endResult: string
  milestones: Milestone[]
}
