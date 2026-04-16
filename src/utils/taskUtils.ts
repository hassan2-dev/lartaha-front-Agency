import type { Task, TaskStatus } from '../api/tasksApi'
import { STATUS_ORDER } from '../constants/tasks'

export interface GroupedTasks {
  todo: Task[]
  in_progress: Task[]
  done: Task[]
}

/**
 * Filter tasks by current workspace
 */
export function filterTasksByWorkspace(tasks: Task[], workspaceId?: string): Task[] {
  if (!workspaceId) return tasks

  return tasks.filter(task => {
    const taskWorkspaceId = (task as unknown as { workspaceId?: string }).workspaceId
    // Include tasks that belong to current workspace or don't have workspaceId (for backward compatibility)
    return !taskWorkspaceId || taskWorkspaceId === workspaceId
  })
}

/**
 * Group tasks by their status
 */
export function groupTasksByStatus(tasks: Task[]): GroupedTasks {
  return {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  }
}

/**
 * Reorder tasks when moving between columns or within the same column
 */
export function reorderTasks(
  current: Task[],
  movingTaskId: string,
  toStatus: TaskStatus,
  targetIndex?: number
): Task[] {
  const movingTask = current.find(item => item.id === movingTaskId)
  if (!movingTask) return current

  const remaining = current.filter(item => item.id !== movingTaskId)
  const groupedByStatus: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    done: [],
  }

  remaining.forEach(item => {
    groupedByStatus[item.status].push(item)
  })

  const movedTask: Task = { ...movingTask, status: toStatus }
  const targetList = groupedByStatus[toStatus]
  const insertIndex = targetIndex !== undefined ? targetIndex : targetList.length

  targetList.splice(insertIndex, 0, movedTask)

  return STATUS_ORDER.flatMap(statusKey => groupedByStatus[statusKey])
}

/**
 * Check if user can edit a task (admin, creator, or assignee)
 */
export function canEditTask(task: Task, currentUserId?: string, isAdmin?: boolean): boolean {
  if (isAdmin) return true
  if (task.createdBy?.id === currentUserId) return true
  const isAssignee = task.assignees?.some(a => a.userId === currentUserId)
  return isAssignee ?? false
}

/**
 * Get effective assignee IDs for task creation
 * Non-admin users are automatically added as assignees
 */
export function getEffectiveAssigneeIds(
  selectedAssignees: string[],
  currentUserId: string | undefined,
  isAdmin: boolean | undefined,
  isEditing: boolean
): string[] {
  if (isEditing) {
    return selectedAssignees
  }

  return Array.from(
    new Set([...selectedAssignees, ...(!isAdmin && currentUserId ? [currentUserId] : [])])
  )
}
