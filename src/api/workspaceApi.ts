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

/**
 * Workspace logo URL when the user is allowed to read `GET /api/workspaces/:id` (usually admins).
 * Members get 403 there — they need `workspaceLogo` (or nested `workspace.logo`) on `GET /api/auth/me`
 * from the backend; we do not call non-existent routes like `/api/workspace` (404 on majlis).
 */
export async function resolveWorkspaceLogoUrl(workspaceId: string): Promise<string | undefined> {
  try {
    const ws = await fetchWorkspace(workspaceId)
    return ws?.logo?.trim() || undefined
  } catch {
    return undefined
  }
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
