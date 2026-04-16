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
import { ClockCircle, Refresh } from '@solar-icons/react'
import { fetchActivities, type Activity } from '../api/activitiesApi'
import { ActivityItemSkeleton, PageHeaderSkeleton } from '../components/SkeletonLoaders'
import {
  formatActivityDescription,
  formatTimeAgo,
  getActivityColor,
  getActivityIcon,
} from '../utils/activity'

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
          endIcon={<Refresh size={20} />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{ gap: 1 }}
        >
          تحديث
        </Button>
      </Box>

      {error && (
        <Card sx={{ mb: 3, bgcolor: 'error.light', border: '1px solid rgba(211, 47, 47, 0.2)' }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {loading && activities.length === 0 ? (
        <>
          <PageHeaderSkeleton />
          <Card sx={{ border: '1px solid rgba(25, 118, 210, 0.12)' }}>
            <CardContent sx={{ p: 0 }}>
              <ActivityItemSkeleton />
              <ActivityItemSkeleton />
              <ActivityItemSkeleton />
              <ActivityItemSkeleton />
              <ActivityItemSkeleton />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{ mb: 0.5, display: 'block' }}
                          >
                            {formatActivityDescription(activity)}
                          </Typography>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'text.secondary',
                            }}
                          >
                            <Box sx={{ color: 'text.secondary', display: 'flex' }}>
                              <ClockCircle size={14} />
                            </Box>
                            <Typography variant="caption" component="span">
                              {formatTimeAgo(activity.createdAt)}
                            </Typography>
                          </span>
                        </span>
                      }
                    />
                  </ListItem>
                  {index < activities.length - 1 && <Divider variant="inset" component="li" />}
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
                <Typography color="text.secondary">لا توجد أنشجة لعرضها</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  )
}
