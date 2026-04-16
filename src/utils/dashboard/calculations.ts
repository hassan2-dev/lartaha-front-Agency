import type { Task } from '../../api/tasksApi'
import type { DashboardStats, OverviewCardData } from '../../types/dashboard'

export const calculateDashboardStats = (tasks: Task[], filesCount: number): DashboardStats => {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.status === 'done').length
  const activeTasks = tasks.filter(task => task.status !== 'done').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    totalTasks,
    completedTasks,
    activeTasks,
    completionRate,
    filesCount,
    dueSoonCount: calculateDueSoonCount(tasks),
  }
}

export const calculateDueSoonCount = (tasks: Task[]): number => {
  const now = new Date()
  const threeDaysLater = new Date()
  threeDaysLater.setDate(now.getDate() + 3)

  return tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false
    const dueDate = new Date(task.dueDate)
    return dueDate >= now && dueDate <= threeDaysLater
  }).length
}

export const generateOverviewCards = (
  stats: DashboardStats,
  loading: boolean
): OverviewCardData[] => [
  {
    title: 'المهام النشطة',
    value: loading ? '...' : String(stats.activeTasks),
    note: `${stats.totalTasks} إجمالي المهام`,
    color: 'primary.main',
  },
  {
    title: 'نسبة الإنجاز',
    value: loading ? '...' : `${stats.completionRate}%`,
    note: `${stats.completedTasks} مهمة مكتملة`,
    color: 'success.main',
  },
  {
    title: 'ملفات مرفوعة',
    value: loading ? '...' : String(stats.filesCount),
    note: 'من مساحة العمل الحالية',
    color: 'info.main',
  },
  {
    title: 'مواعيد قريبة',
    value: loading ? '...' : String(stats.dueSoonCount),
    note: 'خلال الأيام الثلاثة القادمة',
    color: 'warning.main',
  },
]
