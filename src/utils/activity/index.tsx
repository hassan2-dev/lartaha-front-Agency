import { User, Home, ClipboardText, CloudUpload, UserPlus } from '@solar-icons/react'

import { type Activity } from '../../api/activitiesApi'

export function getActivityIcon(action: string) {
  switch (action) {
    case 'created_task':
    case 'updated_task':
    case 'deleted_task':
      return <ClipboardText size={20} />
    case 'uploaded_files':
    case 'deleted_file':
      return <CloudUpload size={20} />
    case 'joined_workspace':
    case 'invited_member':
      return <UserPlus size={20} />
    case 'created_workspace':
      return <Home size={20} />
    default:
      return <User size={20} />
  }
}

interface ThemePalette {
  palette: {
    success: { main: string }
    info: { main: string }
    error: { main: string }
    primary: { main: string }
    secondary: { main: string }
    warning: { main: string }
    grey: { 500: string }
  }
}

export function getActivityColor(action: string, theme: ThemePalette) {
  switch (action) {
    case 'created_task':
      return theme.palette.success.main
    case 'updated_task':
      return theme.palette.info.main
    case 'deleted_task':
    case 'deleted_file':
      return theme.palette.error.main
    case 'uploaded_files':
      return theme.palette.primary.main
    case 'joined_workspace':
    case 'invited_member':
      return theme.palette.secondary.main
    case 'created_workspace':
      return theme.palette.warning.main
    default:
      return theme.palette.grey[500]
  }
}

export function formatActivityDescription(activity: Activity) {
  const { action, details } = activity

  switch (action) {
    case 'created_task':
      return `أنشأ مهمة جديدة: ${details.taskTitle || 'غير محدد'}`
    case 'updated_task':
      return `حدّث المهمة: ${details.taskTitle || 'غير محدد'}`
    case 'deleted_task':
      return `حذف المهمة: ${details.taskTitle || 'غير محدد'}`
    case 'uploaded_files': {
      const count = (details.fileCount as number) || 1
      return `رفع ${count} ملف${count > 1 ? 'ات' : ''}`
    }
    case 'deleted_file':
      return `حذف ملف: ${details.fileName || 'غير محدد'}`
    case 'joined_workspace':
      return `انضم إلى مساحة العمل`
    case 'invited_member':
      return `دعا عضواً جديداً: ${details.email || 'غير محدد'}`
    case 'created_workspace':
      return `أنشأ مساحة عمل: ${details.workspaceName || 'غير محدد'}`
    default:
      return `نفذ إجراء: ${action}`
  }
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  if (diffDays < 7) return `منذ ${diffDays} يوم`

  return date.toLocaleDateString('ar-SA')
}
