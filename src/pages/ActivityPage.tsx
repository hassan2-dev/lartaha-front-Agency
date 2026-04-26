import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Collapse,
  Tooltip,
} from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'
import { ClockCircle, Refresh } from '@solar-icons/react'
import { fetchActivities, type Activity } from '../api/activitiesApi'
import { ActivityItemSkeleton, PageHeaderSkeleton } from '../components/SkeletonLoaders'
import { ROUTES } from '../constants/routes'
import {
  formatActivityDescription,
  formatTimeAgo,
  getActivityColor,
  getActivityIcon,
} from '../utils/activity'

interface FileDetails {
  key: string
  size?: string
}

function extractFileInfo(key: string) {
  const parts = key.split('/')
  const filename = parts[parts.length - 1]
  const directory = parts.slice(0, -1).join('/')
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  return { filename, directory, extension }
}

function stripUploadsPrefix(path: string): string {
  // Remove 'uploads/{workspaceId}/' prefix.
  // Path format: uploads/{workspaceId}/folder/subfolder or uploads/{workspaceId}
  // Result should be: folder/subfolder or empty (relative path within workspace)

  // Remove the uploads/ prefix and workspace ID folder
  let result = path.replace(/^uploads\/[^/]+\/?/, '')
  return result
}

function getFileIcon(extension: string) {
  const icons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    zip: '📦',
    rar: '📦',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    svg: '🖼️',
    mp4: '🎬',
    mp3: '🎵',
    txt: '📄',
    csv: '📊',
    json: '⚙️',
    js: '⚙️',
    ts: '⚙️',
    tsx: '⚙️',
  }
  return icons[extension] || '📁'
}

function FileListDetails({
  files,
  onNavigate,
}: {
  files: FileDetails[]
  onNavigate: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (!files || files.length === 0) return null

  if (files.length === 1) {
    const { filename, directory, extension } = extractFileInfo(files[0].key)
    const icon = getFileIcon(extension)
    const cleanPath = stripUploadsPrefix(directory)
    return (
      <Tooltip title={directory || 'Root directory'}>
        <Box
          component="button"
          onClick={() => onNavigate(cleanPath)}
          sx={{
            mt: 0.75,
            ml: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'rgba(25, 118, 210, 0.08)',
            px: 1,
            py: 0.4,
            borderRadius: 0.75,
            maxWidth: '100%',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(25, 118, 210, 0.15)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
            {icon}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.secondary',
            }}
          >
            {filename}
          </Typography>
        </Box>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ mt: 0.75 }}>
      <Button
        size="small"
        onClick={() => setExpanded(!expanded)}
        sx={{
          textTransform: 'none',
          p: 0.25,
          gap: 0.5,
          fontSize: '0.75rem',
          bgcolor: 'rgba(25, 118, 210, 0.08)',
          color: 'primary.main',
          '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.12)' },
        }}
        endIcon={
          expanded ? (
            <ExpandLess sx={{ fontSize: '0.875rem' }} />
          ) : (
            <ExpandMore sx={{ fontSize: '0.875rem' }} />
          )
        }
      >
        {files.length} ملفات
      </Button>
      <Collapse in={expanded}>
        <Box sx={{ mt: 0.75, ml: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {files.map((file, idx) => {
            const { filename, directory, extension } = extractFileInfo(file.key)
            const icon = getFileIcon(extension)
            const cleanPath = stripUploadsPrefix(directory)
            return (
              <Tooltip key={idx} title={directory || 'Root directory'}>
                <Box
                  component="button"
                  onClick={() => onNavigate(cleanPath)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: 'rgba(25, 118, 210, 0.06)',
                    px: 0.75,
                    py: 0.3,
                    borderRadius: 0.5,
                    maxWidth: '100%',
                    width: 'fit-content',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.12)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {icon}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'text.secondary',
                    }}
                  >
                    {filename}
                  </Typography>
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      </Collapse>
    </Box>
  )
}

export default function ActivityPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const handleNavigateToFolder = (folderPath: string) => {
    const cleanPath = stripUploadsPrefix(folderPath)
    const encodedPath = encodeURIComponent(cleanPath || '/')
    navigate(`${ROUTES.APP.UPLOAD}?folder=${encodedPath}`)
  }

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
                          {(activity.action === 'uploaded_files' ||
                            activity.action === 'deleted_file') && (
                            <FileListDetails
                              files={
                                activity.action === 'uploaded_files'
                                  ? (activity.details.files as FileDetails[]) || []
                                  : [{ key: activity.details.fileKey as string }]
                              }
                              onNavigate={handleNavigateToFolder}
                            />
                          )}
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'text.secondary',
                              marginTop: '8px',
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
