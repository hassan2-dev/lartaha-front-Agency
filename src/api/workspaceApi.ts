import { api } from './http'

export interface Workspace {
  id: string
  name: string
  industry?: string
  logo?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateWorkspaceData {
  name?: string
  industry?: string
  logo?: string
}

export async function fetchWorkspace(workspaceId: string): Promise<Workspace> {
  const res = await api.get(`/api/workspaces/${workspaceId}`)
  return res.data.workspace
}

export async function updateWorkspace(
  workspaceId: string,
  data: UpdateWorkspaceData
): Promise<Workspace> {
  const res = await api.patch(`/api/workspaces/${workspaceId}`, data)
  return res.data.workspace
}

export async function getWorkspaceEncryptionKey(): Promise<{ ok?: boolean; key?: string }> {
  const res = await api.get('/api/workspace/encryption-key')
  return res.data as { ok?: boolean; key?: string }
}
