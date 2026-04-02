import { api } from './http'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  position?: string
}

export interface TaskAssignment {
  id: string
  taskId: string
  userId: string
  assignedAt: string
  user: User
}

export interface ChecklistItem {
  id: string
  taskId: string
  text: string
  completed: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface TaskLink {
  id: string
  taskId: string
  url: string
  title?: string
  type: string
  createdAt: string
}

export interface TaskAttachment {
  id: string
  taskId: string
  fileId: string
  filename: string
  mimeType?: string
  size?: number
  uploadedAt: string
  file: {
    id: string
    filename: string
    size?: number
    mimeType?: string
  }
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  parentId?: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  assignees?: TaskAssignment[]
  checklists?: ChecklistItem[]
  links?: TaskLink[]
  attachments?: TaskAttachment[]
  subtasks?: Task[]
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  parentId?: string
  assigneeIds?: string[]
  checklists?: { text: string; completed?: boolean }[]
  links?: { url: string; title?: string; type?: string }[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  parentId?: string
  assigneeIds?: string[]
  checklists?: { text: string; completed?: boolean }[]
  links?: { url: string; title?: string; type?: string }[]
}

export interface TasksPaginationParams {
  limit?: number
  cursor?: string
  offset?: number
}

export interface TasksResponse {
  ok: boolean
  tasks: Task[]
  pagination: {
    hasMore: boolean
    nextCursor: string | null
    limit: number
    offset: number
  }
}

export async function getTasks(params?: TasksPaginationParams): Promise<TasksResponse> {
  const searchParams = new URLSearchParams()

  if (params?.limit) {
    searchParams.set('limit', String(params.limit))
  }
  if (params?.cursor) {
    searchParams.set('cursor', params.cursor)
  }
  if (params?.offset) {
    searchParams.set('offset', String(params.offset))
  }

  const query = searchParams.toString()
  const url = `/api/tasks${query ? `?${query}` : ''}`

  console.log('🌐 Making API call to:', url)

  const res = await api.get(url)
  console.log('🌐 Raw response from server:', res.data)

  return res.data as TasksResponse
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await api.post('/api/tasks', input)
  return res.data.task as Task
}

export async function updateTask(
  id: string,
  patch: UpdateTaskInput
): Promise<Task> {
  const res = await api.patch(`/api/tasks/${id}`, patch)
  return res.data.task as Task
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/api/tasks/${id}`)
}

export async function getWorkspaceUsers(): Promise<User[]> {
  const res = await api.get('/api/workspace/users')
  return (res.data?.users ?? []) as User[]
}

export async function updateChecklistItem(
  taskId: string,
  itemId: string,
  update: { completed?: boolean; text?: string }
): Promise<ChecklistItem> {
  const res = await api.patch(`/api/tasks/${taskId}/checklist/${itemId}`, update)
  return res.data.checklistItem as ChecklistItem
}

export async function addTaskLink(
  taskId: string,
  link: { url: string; title?: string; type?: string }
): Promise<TaskLink> {
  const res = await api.post(`/api/tasks/${taskId}/links`, link)
  return res.data.link as TaskLink
}

export async function deleteTaskLink(taskId: string, linkId: string): Promise<void> {
  await api.delete(`/api/tasks/${taskId}/links/${linkId}`)
}

export async function addTaskAttachment(
  taskId: string,
  attachment: { fileId: string; filename: string; mimeType?: string; size?: number }
): Promise<TaskAttachment> {
  const res = await api.post(`/api/tasks/${taskId}/attachments`, attachment)
  return res.data.attachment as TaskAttachment
}

export async function deleteTaskAttachment(taskId: string, attachmentId: string): Promise<void> {
  await api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
}

