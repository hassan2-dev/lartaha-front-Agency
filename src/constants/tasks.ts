import type { TaskStatus } from '../api/tasksApi'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  done: 'منجزة',
}

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done']

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo'
export const DEFAULT_TASK_PRIORITY = 'medium' as const
