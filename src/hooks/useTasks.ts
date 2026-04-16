import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Task, User } from '../api/tasksApi'
import { getTasks, getWorkspaceUsers, updateChecklistItem } from '../api/tasksApi'
import { subscribeRealtime } from '../api/realtimeApi'
import { filterTasksByWorkspace, groupTasksByStatus } from '../utils/taskUtils'

interface UseTasksOptions {
  workspaceId?: string
  workspaceName?: string
}

interface UseTasksReturn {
  tasks: Task[]
  groupedTasks: ReturnType<typeof groupTasksByStatus>
  workspaceUsers: User[]
  loading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  refresh: (options?: { silent?: boolean; reset?: boolean }) => Promise<void>
  loadMore: () => Promise<void>
  handleChecklistUpdate: (
    taskId: string,
    itemId: string,
    update: { completed?: boolean; text?: string }
  ) => Promise<void>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { workspaceId, workspaceName } = options

  const [tasks, setTasks] = useState<Task[]>([])
  const [workspaceUsers, setWorkspaceUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const refresh = useCallback(
    async (refreshOptions?: { silent?: boolean; reset?: boolean }) => {
      const silent = refreshOptions?.silent === true
      const reset = refreshOptions?.reset === true

      if (!silent) {
        setError(null)
        setLoading(true)
      }

      try {
        const tasksParams = reset
          ? { limit: 50 }
          : { limit: 50, ...(nextCursor && { cursor: nextCursor }) }

        console.log('🔄 Tasks fetch request:', {
          reset,
          nextCursor,
          params: tasksParams,
          currentTasksCount: tasks.length,
        })

        const [tasksData, usersData] = await Promise.all([
          getTasks(tasksParams),
          getWorkspaceUsers(),
        ])

        console.log('🔄 Raw API response:', tasksData)
        console.log('🏢 Current user workspace:', workspaceId, workspaceName)
        console.log('📋 Tasks loaded:', tasksData.tasks.length)
        console.log(
          '📋 Task workspace IDs:',
          tasksData.tasks.map(t => ({
            id: t.id,
            title: t.title,
            workspaceId: (t as unknown as { workspaceId?: string }).workspaceId,
          }))
        )
        console.log('📋 Pagination response:', tasksData.pagination)

        if (reset) {
          setTasks(tasksData.tasks)
        } else {
          setTasks(prev => [...prev, ...tasksData.tasks])
        }

        setHasMore(tasksData.pagination?.hasMore ?? false)
        setNextCursor(tasksData.pagination?.nextCursor ?? null)
        setWorkspaceUsers(usersData)
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل جلب المهام')
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [nextCursor, tasks.length, workspaceId, workspaceName]
  )

  // Initial load
  useEffect(() => {
    void refresh({ reset: true })
  }, [])

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      event => {
        if (event.scope !== 'tasks') return
        void refresh({ silent: true, reset: true })
      },
      () => {
        // keep UI functional even if realtime stream disconnects
      }
    )

    return unsubscribe
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return

    setIsLoadingMore(true)
    try {
      await refresh({ silent: true })
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, loading])

  const handleChecklistUpdate = useCallback(
    async (taskId: string, itemId: string, update: { completed?: boolean; text?: string }) => {
      setError(null)
      try {
        await updateChecklistItem(taskId, itemId, update)
        await refresh({ silent: true, reset: true })
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل تحديث عنصر قائمة التحقق')
      }
    },
    [refresh]
  )

  const filteredTasks = useMemo(
    () => filterTasksByWorkspace(tasks, workspaceId),
    [tasks, workspaceId]
  )

  const groupedTasks = useMemo(() => groupTasksByStatus(filteredTasks), [filteredTasks])

  return {
    tasks,
    groupedTasks,
    workspaceUsers,
    loading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    handleChecklistUpdate,
    setTasks,
    setError,
  }
}
