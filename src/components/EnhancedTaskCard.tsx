import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Link as MuiLink,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon,
  SubdirectoryArrowRight as SubdirectoryArrowRightIcon,
} from '@mui/icons-material'
import type { Task, TaskStatus, TaskPriority } from '../api/tasksApi'
import { useAuth } from '../contexts/AuthContext'

interface EnhancedTaskCardProps {
  task: Task
  onChecklistUpdate: (
    taskId: string,
    itemId: string,
    update: { completed?: boolean; text?: string }
  ) => Promise<void>
  onTaskClick?: (task: Task) => void
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  done: 'منجزة',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  urgent: 'عاجل',
}

const PRIORITY_COLOR: Record<
  TaskPriority,
  'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
> = {
  low: 'default',
  medium: 'primary',
  high: 'warning',
  urgent: 'error',
}

export default function EnhancedTaskCard({
  task,
  onChecklistUpdate,
  onTaskClick,
}: EnhancedTaskCardProps) {
  const { user } = useAuth()

  // Permission helper function
  const canEditTask = () => {
    const isAssignee = task.assignees?.some(a => a.userId === user?.id)
    return user?.isAdmin || task.createdBy?.id === user?.id || isAssignee
  }

  const handleChecklistToggle = (itemId: string, completed: boolean) => {
    if (!canEditTask()) return
    onChecklistUpdate(task.id, itemId, { completed })
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, a, [role="button"]')) {
      return
    }
    // Prevent click during drag operations
    if (e.defaultPrevented) {
      return
    }
    onTaskClick?.(task)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('ar-SA')
  }

  const completedChecklistItems = task.checklists?.filter(item => item.completed).length || 0
  const totalChecklistItems = task.checklists?.length || 0
  const hasAccess = canEditTask()

  return (
    <Paper
      elevation={0}
      onClick={handleCardClick}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.02)',
        border: task.parentId
          ? '1px solid rgba(25, 118, 210, 0.3)'
          : '1px solid rgba(25, 118, 210, 0.15)',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        opacity: hasAccess ? 1 : 0.6,
        '&:hover': {
          background: 'rgba(255,255,255,0.04)',
          transform: 'translateY(-2px)',
          border: task.parentId
            ? '1px solid rgba(25, 118, 210, 0.5)'
            : '1px solid rgba(25, 118, 210, 0.25)',
        },
      }}
    >
      {/* Header with title */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        {task.parentId && (
          <SubdirectoryArrowRightIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.5 }} />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>
            {task.title}
          </Typography>
          {task.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              {task.description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Status, Priority, and Due Date */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label={STATUS_LABEL[task.status]}
          color={
            task.status === 'done'
              ? 'success'
              : task.status === 'in_progress'
                ? 'warning'
                : 'default'
          }
          size="small"
        />
        <Chip
          label={PRIORITY_LABEL[task.priority]}
          color={PRIORITY_COLOR[task.priority]}
          size="small"
        />
        {task.dueDate && (
          <Chip label={`📅 ${formatDate(task.dueDate)}`} variant="outlined" size="small" />
        )}
      </Box>

      {/* Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            المسند إليهم:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {task.assignees.map(assignment => (
              <Chip
                key={assignment.user.id}
                avatar={
                  assignment.user.avatar ? (
                    <Avatar src={assignment.user.avatar} sx={{ width: 20, height: 20 }} />
                  ) : (
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                      {assignment.user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  )
                }
                label={assignment.user.name}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Expandable Details */}
      {((task.checklists?.length ?? 0) > 0 ||
        (task.links?.length ?? 0) > 0 ||
        (task.attachments?.length ?? 0) > 0) && (
        <Accordion sx={{ background: 'transparent', boxShadow: 'none' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">التفاصيل الإضافية</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {/* Checklist */}
            {task.checklists && task.checklists.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
                >
                  قائمة المهام ({completedChecklistItems}/{totalChecklistItems})
                </Typography>
                <List dense>
                  {task.checklists.map(item => (
                    <ListItem key={item.id} disablePadding>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={item.completed}
                          onChange={e => handleChecklistToggle(item.id, e.target.checked)}
                          size="small"
                          disabled={!canEditTask()}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={{
                          textDecoration: item.completed ? 'line-through' : 'none',
                          opacity: item.completed ? 0.6 : 1,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Links */}
            {task.links && task.links.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
                >
                  الروابط:
                </Typography>
                <List dense>
                  {task.links.map(link => (
                    <ListItem key={link.id} disablePadding>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <LinkIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <MuiLink
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                          >
                            {link.title || link.url}
                          </MuiLink>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
                >
                  المرفقات:
                </Typography>
                <List dense>
                  {task.attachments.map(attachment => (
                    <ListItem key={attachment.id} disablePadding>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <AttachFileIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.filename}
                        secondary={
                          attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : undefined
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  )
}
