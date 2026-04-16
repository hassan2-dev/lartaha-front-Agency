import { api } from './http'

export interface Activity {
  id: string
  action: string
  actor: {
    id: string
    name: string
    email: string
    avatar?: string
    isAdmin: boolean
  }
  details: Record<string, unknown>
  createdAt: string
}

export interface ActivitiesResponse {
  activities: Activity[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export async function fetchActivities(params?: {
  limit?: number
  offset?: number
}): Promise<ActivitiesResponse> {
  const searchParams = new URLSearchParams()

  if (params?.limit) {
    searchParams.append('limit', params.limit.toString())
  }

  if (params?.offset) {
    searchParams.append('offset', params.offset.toString())
  }

  const url = `/api/activities${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const res = await api.get(url)
  return res.data as ActivitiesResponse
}
