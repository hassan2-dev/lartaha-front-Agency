import type { Task } from '../api/tasksApi'

export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  activeTasks: number
  completionRate: number
  filesCount: number
  dueSoonCount: number
}

export interface OverviewCardData {
  title: string
  value: string
  note: string
  color: string
}

export interface QuickActionData {
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  color: string
  disabled?: boolean
}

export interface ActionFeedback {
  type: 'success' | 'error'
  message: string
}

export interface UseDashboardStatsReturn {
  tasks: Task[]
  stats: DashboardStats
  loading: boolean
  error: string | null
  refreshStats: () => Promise<void>
}

export interface UseTaskCreationReturn {
  isOpen: boolean
  title: string
  description: string
  isCreating: boolean
  feedback: ActionFeedback | null
  openDialog: () => void
  closeDialog: () => void
  setTitle: (title: string) => void
  setDescription: (description: string) => void
  createTask: () => Promise<Task | null>
}

export interface UseFileUploadReturn {
  isUploading: boolean
  progress: number
  feedback: ActionFeedback | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  openFilePicker: () => void
  handleUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  clearFeedback: () => void
}
