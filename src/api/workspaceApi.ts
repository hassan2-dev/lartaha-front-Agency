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

function extractWorkspaceLogoFromBody(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object') return undefined
  const root = data as Record<string, unknown>
  for (const wrapKey of ['workspace', 'data', 'workspaceSummary'] as const) {
    const nested = root[wrapKey]
    if (nested && typeof nested === 'object') {
      const o = nested as Record<string, unknown>
      for (const lk of ['logo', 'workspaceLogo', 'logoUrl'] as const) {
        const v = o[lk]
        if (typeof v === 'string' && v.trim()) return v.trim()
      }
    }
  }
  for (const lk of ['logo', 'workspaceLogo', 'logoUrl'] as const) {
    const v = root[lk]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

/**
 * Workspace logo for SideNav / auth hydrate.
 * `GET /api/workspaces/:id` is often admin-only; on 403/401 we try member-safe routes if the backend exposes them.
 */
export async function resolveWorkspaceLogoUrl(workspaceId: string): Promise<string | undefined> {
  try {
    const ws = await fetchWorkspace(workspaceId)
    if (ws?.logo?.trim()) return ws.logo.trim()
  } catch (firstErr) {
    const status = (firstErr as { response?: { status?: number } })?.response?.status
    if (status && status !== 403 && status !== 401 && status !== 404) {
      return undefined
    }
  }

  const paths = [`/api/workspace`, `/api/workspaces/${workspaceId}/summary`]
  for (const path of paths) {
    try {
      const res = await api.get(path)
      const hit = extractWorkspaceLogoFromBody(res.data)
      if (hit) return hit
    } catch {
      continue
    }
  }
  return undefined
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
