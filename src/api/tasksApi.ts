import { api } from './http'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export async function getTasks(): Promise<Task[]> {
  const res = await api.get('/api/tasks')
  return (res.data?.tasks ?? []) as Task[]
}

export async function createTask(input: {
  title: string
  description?: string
  status?: TaskStatus
}): Promise<Task> {
  const res = await api.post('/api/tasks', input)
  return res.data.task as Task
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'status'>>
): Promise<Task> {
  const res = await api.patch(`/api/tasks/${id}`, patch)
  return res.data.task as Task
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/api/tasks/${id}`)
}

