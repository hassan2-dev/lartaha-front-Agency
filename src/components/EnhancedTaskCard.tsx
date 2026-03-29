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
  Button,
  Link as MuiLink,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon,
  SubdirectoryArrowRight as SubdirectoryArrowRightIcon,
} from '@mui/icons-material'
import type { Task, TaskStatus, TaskPriority } from '../api/tasksApi'

interface EnhancedTaskCardProps {
  task: Task
  onChecklistUpdate: (taskId: string, itemId: string, update: { completed?: boolean; text?: string }) => Promise<void>
  onSubtaskCreate?: (parentId: string) => void
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

const PRIORITY_COLOR: Record<TaskPriority, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
  low: 'default',
  medium: 'primary',
  high: 'warning',
  urgent: 'error',
}

export default function EnhancedTaskCard({
  task,
  onChecklistUpdate,
  onSubtaskCreate,
  onTaskClick,
}: EnhancedTaskCardProps) {
  const handleChecklistToggle = (itemId: string, completed: boolean) => {
    onChecklistUpdate(task.id, itemId, { completed })
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, a, [role="button"]')) {
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

  return (
    <Paper
      onClick={handleCardClick}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.02)',
        border: task.parentId ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid rgba(255,255,255,0.1)',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          background: 'rgba(255,255,255,0.04)',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* Header with title */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        {task.parentId && <SubdirectoryArrowRightIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.5 }} />}
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
            task.status === 'done' ? 'success' :
              task.status === 'in_progress' ? 'warning' : 'default'
          }
          size="small"
        />
        <Chip
          label={PRIORITY_LABEL[task.priority]}
          color={PRIORITY_COLOR[task.priority]}
          size="small"
        />
        {task.dueDate && (
          <Chip
            label={`📅 ${formatDate(task.dueDate)}`}
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      {/* Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            المسند إليهم:
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {task.assignees.map((assignment) => (
              <Chip
                key={assignment.user.id}
                avatar={<Avatar src={assignment.user.avatar} sx={{ width: 20, height: 20 }} />}
                label={assignment.user.name}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Expandable Details */}
      {(task.checklists?.length || task.links?.length || task.attachments?.length || task.subtasks?.length) && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              التفاصيل ({[
                task.checklists?.length && `${completedChecklistItems}/${totalChecklistItems} checklist`,
                task.links?.length && `${task.links.length} links`,
                task.attachments?.length && `${task.attachments.length} attachments`,
                task.subtasks?.length && `${task.subtasks.length} subtasks`,
              ].filter(Boolean).join(', ')})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Checklist */}
              {task.checklists && task.checklists.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    قائمة التحقق ({completedChecklistItems}/{totalChecklistItems})
                  </Typography>
                  <List dense>
                    {task.checklists.map((item) => (
                      <ListItem key={item.id}>
                        <Checkbox
                          checked={item.completed}
                          onChange={(e) => handleChecklistToggle(item.id, e.target.checked)}
                        />
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
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    الروابط
                  </Typography>
                  <List dense>
                    {task.links.map((link) => (
                      <ListItem key={link.id}>
                        <ListItemIcon>
                          <LinkIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <MuiLink href={link.url} target="_blank" rel="noopener noreferrer">
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
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    المرفقات
                  </Typography>
                  <List dense>
                    {task.attachments.map((attachment) => (
                      <ListItem key={attachment.id}>
                        <ListItemIcon>
                          <AttachFileIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={attachment.filename}
                          secondary={attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : undefined}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">
                      المهام الفرعية ({task.subtasks.length})
                    </Typography>
                    {onSubtaskCreate && (
                      <Button
                        size="small"
                        onClick={() => onSubtaskCreate(task.id)}
                        startIcon={<SubdirectoryArrowRightIcon />}
                      >
                        إضافة مهمة فرعية
                      </Button>
                    )}
                  </Box>
                  {task.subtasks.map((subtask) => (
                    <Box key={subtask.id} sx={{ ml: 2, mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {subtask.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={STATUS_LABEL[subtask.status]} size="small" variant="outlined" />
                        {subtask.assignees && subtask.assignees.length > 0 && (
                          <Chip
                            avatar={<Avatar src={subtask.assignees[0].user.avatar} sx={{ width: 16, height: 16 }} />}
                            label={subtask.assignees[0].user.name}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  )
}
