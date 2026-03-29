import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Button,
  Container,
  Divider,
  useTheme,
} from '@mui/material'
import {
  Person as PersonIcon,
  Schedule as TimeIcon,
  Refresh as RefreshIcon,
  Work as WorkIcon,
  Task as TaskIcon,
  UploadFile as UploadIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material'
import { fetchActivities, type Activity } from '../api/activitiesApi'

function getActivityIcon(action: string) {
  switch (action) {
    case 'created_task':
    case 'updated_task':
    case 'deleted_task':
      return <TaskIcon />
    case 'uploaded_files':
    case 'deleted_file':
      return <UploadIcon />
    case 'joined_workspace':
    case 'invited_member':
      return <GroupAddIcon />
    case 'created_workspace':
      return <WorkIcon />
    default:
      return <PersonIcon />
  }
}

function getActivityColor(action: string, theme: any) {
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

function formatActivityDescription(activity: Activity) {
  const { action, details } = activity

  switch (action) {
    case 'created_task':
      return `أنشأ مهمة جديدة: ${details.taskTitle || 'غير محدد'}`
    case 'updated_task':
      return `حدّث المهمة: ${details.taskTitle || 'غير محدد'}`
    case 'deleted_task':
      return `حذف المهمة: ${details.taskTitle || 'غير محدد'}`
    case 'uploaded_files':
      const count = details.fileCount || 1
      return `رفع ${count} ملف${count > 1 ? 'ات' : ''}`
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

function formatTimeAgo(dateString: string) {
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

export default function ActivityPage() {
  const theme = useTheme()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const loadActivities = async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset
      const response = await fetchActivities({
        limit: 20,
        offset: currentOffset,
      })

      if (reset) {
        setActivities(response.activities)
        setOffset(20)
      } else {
        setActivities(prev => [...prev, ...response.activities])
        setOffset(prev => prev + 20)
      }

      setHasMore(response.pagination.hasMore)
    } catch (err) {
      setError('فشل في تحميل الأنشطة')
      console.error('Failed to load activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadActivities(true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      loadActivities(false)
    }
  }

  useEffect(() => {
    loadActivities(true)
  }, [])

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          سجل الأنشطة
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          تحديث
        </Button>
      </Box>

      {error && (
        <Card sx={{ mb: 3, bgcolor: 'error.light' }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {loading && activities.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <List>
              {activities.map((activity, index) => (
                <Box key={activity.id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar
                        src={activity.actor.avatar}
                        sx={{
                          bgcolor: getActivityColor(activity.action, theme),
                          color: 'white',
                        }}
                      >
                        {activity.actor.avatar ? (
                          <img src={activity.actor.avatar} alt={activity.actor.name} />
                        ) : (
                          getActivityIcon(activity.action)
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {activity.actor.name}
                          </Typography>
                          <Chip
                            label={activity.actor.isAdmin ? 'مدير' : 'عضو'}
                            size="small"
                            color={activity.actor.isAdmin ? 'secondary' : 'primary'}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <span style={{ display: 'block', marginTop: '8px' }}>
                          <Typography variant="body2" component="span" sx={{ mb: 0.5, display: 'block' }}>
                            {formatActivityDescription(activity)}
                          </Typography>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'text.secondary' }}>
                            <TimeIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" component="span">
                              {formatTimeAgo(activity.createdAt)}
                            </Typography>
                          </span>
                        </span>
                      }
                    />
                  </ListItem>
                  {index < activities.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </Box>
              ))}
            </List>

            {hasMore && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'تحميل المزيد'}
                </Button>
              </Box>
            )}

            {activities.length === 0 && !loading && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  لا توجد أنشجة لعرضها
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  )
}
