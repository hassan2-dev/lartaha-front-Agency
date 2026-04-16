import { useCallback, useEffect, useState } from 'react'
import { getTasks, type Task } from '../../api/tasksApi'
import { listUploadedObjects } from '../../api/uploadApi'
import { calculateDashboardStats } from '../../utils/dashboard/calculations'
import { extractErrorMessage } from '../../utils/dashboard/errorHandling'
import type { DashboardStats, UseDashboardStatsReturn } from '../../types/dashboard'

export const useDashboardStats = (): UseDashboardStatsReturn => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filesCount, setFilesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasksResult, filesResult] = await Promise.all([
        getTasks(),
        listUploadedObjects('', 1000, false),
      ])
      setTasks(tasksResult.tasks)
      setFilesCount(filesResult.objects?.length ?? 0)
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'تعذر تحميل بيانات لوحة التحكم'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const stats: DashboardStats = calculateDashboardStats(tasks, filesCount)

  return {
    tasks,
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  }
}
