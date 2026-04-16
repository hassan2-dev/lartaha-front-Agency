import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Button,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { Delete as DeleteIcon, Add as AddIcon, Link as LinkIcon } from '@mui/icons-material'
import type { TaskPriority, User } from '../api/tasksApi'

interface EnhancedTaskFormProps {
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: TaskPriority
  dueDate: string
  selectedAssignees: string[]
  checklistItems: { text: string; completed?: boolean }[]
  links: { url: string; title?: string }[]
  workspaceUsers: User[]
  newChecklistItem: string
  newLink: { url: string; title: string }
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStatusChange: (value: 'todo' | 'in_progress' | 'done') => void
  onPriorityChange: (value: TaskPriority) => void
  onDueDateChange: (value: string) => void
  onAssigneesChange: (value: string[]) => void
  onChecklistItemsChange: (value: { text: string; completed?: boolean }[]) => void
  onNewChecklistItemChange: (value: string) => void
  onNewLinkChange: (value: { url: string; title: string }) => void
  onAddChecklistItem: () => void
  onRemoveChecklistItem: (index: number) => void
  onAddLink: () => void
  onRemoveLink: (index: number) => void
}

const STATUS_LABEL = {
  todo: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  done: 'منجزة',
}

const PRIORITY_LABEL = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  urgent: 'عاجل',
}

export default function EnhancedTaskForm({
  title,
  description,
  status,
  priority,
  dueDate,
  selectedAssignees,
  links,
  workspaceUsers,
  newLink,
  onTitleChange,
  onDescriptionChange,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssigneesChange,
  onNewLinkChange,
  onAddLink,
  onRemoveLink,
}: EnhancedTaskFormProps) {
  const handleAssigneeToggle = (userId: string) => {
    const newAssignees = selectedAssignees.includes(userId)
      ? selectedAssignees.filter(id => id !== userId)
      : [...selectedAssignees, userId]
    onAssigneesChange(newAssignees)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Basic Fields */}
      <TextField
        label="العنوان"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        fullWidth
        required
        sx={{
          '& .MuiInputLabel-root': {
            right: 20,
            left: 'auto',
            transformOrigin: 'right top',
          },
          '& .MuiInputBase-input': {
            textAlign: 'right',
            paddingRight: '20px',
          },
        }}
      />

      <TextField
        label="الوصف"
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        sx={{
          '& .MuiInputLabel-root': {
            right: 20,
            left: 'auto',
            transformOrigin: 'right top',
          },
          '& .MuiInputBase-input': {
            textAlign: 'right',
            paddingRight: '20px',
          },
        }}
      />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel
            sx={{
              right: 20,
              left: 'auto',
              transformOrigin: 'right top',
            }}
          >
            الحالة
          </InputLabel>
          <Select
            value={status}
            onChange={e => onStatusChange(e.target.value as 'todo' | 'in_progress' | 'done')}
            label="الحالة"
            sx={{
              textAlign: 'right',
              '& .MuiSelect-select': {
                textAlign: 'right',
                paddingRight: '20px',
              },
            }}
          >
            <MenuItem value="todo">{STATUS_LABEL.todo}</MenuItem>
            <MenuItem value="in_progress">{STATUS_LABEL.in_progress}</MenuItem>
            <MenuItem value="done">{STATUS_LABEL.done}</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel
            sx={{
              right: 20,
              left: 'auto',
              transformOrigin: 'right top',
            }}
          >
            الأولوية
          </InputLabel>
          <Select
            value={priority}
            onChange={e => onPriorityChange(e.target.value as TaskPriority)}
            label="الأولوية"
            sx={{
              textAlign: 'right',
              '& .MuiSelect-select': {
                textAlign: 'right',
                paddingRight: '20px',
              },
            }}
          >
            <MenuItem value="low">{PRIORITY_LABEL.low}</MenuItem>
            <MenuItem value="medium">{PRIORITY_LABEL.medium}</MenuItem>
            <MenuItem value="high">{PRIORITY_LABEL.high}</MenuItem>
            <MenuItem value="urgent">{PRIORITY_LABEL.urgent}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          type="date"
          label="تاريخ الاستحقاق"
          value={dueDate}
          onChange={e => onDueDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            minWidth: 180,
            '& .MuiInputLabel-root': {
              right: 20,
              left: 'auto',
              transformOrigin: 'right top',
            },
            '& .MuiInputBase-input': {
              textAlign: 'right',
              paddingRight: '20px',
            },
          }}
        />
      </Box>

      {/* Assignees */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          المسند إليهم
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {workspaceUsers.map(user => (
            <Chip
              key={user.id}
              avatar={<Avatar src={user.avatar} sx={{ width: 24, height: 24 }} />}
              label={user.name}
              clickable
              onClick={() => handleAssigneeToggle(user.id)}
              color={selectedAssignees.includes(user.id) ? 'primary' : 'default'}
              variant={selectedAssignees.includes(user.id) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Checklist */}
      {/* <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          قائمة التحقق
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="عنصر جديد"
            value={newChecklistItem}
            onChange={(e) => onNewChecklistItemChange(e.target.value)}
            size="small"
            onKeyPress={(e) => e.key === 'Enter' && onAddChecklistItem()}
            sx={{
              flex: 1,
              '& .MuiInputLabel-root': {
                right: 14,
                left: 'auto',
                transformOrigin: 'right top',
              },
              '& .MuiInputBase-input': {
                textAlign: 'right',
              },
            }}
          />
          <Button onClick={onAddChecklistItem} disabled={!newChecklistItem.trim()}>
            <AddIcon />
          </Button>
        </Box>

        {checklistItems.length > 0 && (
          <List dense>
            {checklistItems.map((item, index) => (
              <ListItem key={index}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.completed || false}
                      onChange={() => handleChecklistItemToggle(index)}
                    />
                  }
                  label={item.text}
                  sx={{ flex: 1 }}
                />
                <IconButton onClick={() => onRemoveChecklistItem(index)} size="small">
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box> */}

      {/* Links */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          الروابط
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
          <TextField
            label="الرابط"
            value={newLink.url}
            onChange={e => onNewLinkChange({ ...newLink, url: e.target.value })}
            size="small"
            sx={{
              flex: 2,
              '& .MuiInputLabel-root': {
                right: 14,
                left: 'auto',
                transformOrigin: 'right top',
              },
              '& .MuiInputBase-input': {
                textAlign: 'right',
              },
            }}
          />
          <TextField
            label="العنوان (اختياري)"
            value={newLink.title}
            onChange={e => onNewLinkChange({ ...newLink, title: e.target.value })}
            size="small"
            sx={{
              flex: 1,
              '& .MuiInputLabel-root': {
                right: 14,
                left: 'auto',
                transformOrigin: 'right top',
              },
              '& .MuiInputBase-input': {
                textAlign: 'right',
              },
            }}
          />
          <Button onClick={onAddLink} disabled={!newLink.url.trim()}>
            <AddIcon />
          </Button>
        </Box>

        {links.length > 0 && (
          <List dense>
            {links.map((link, index) => (
              <ListItem key={index}>
                <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <ListItemText
                  primary={link.title || link.url}
                  secondary={link.title ? link.url : undefined}
                />
                <IconButton onClick={() => onRemoveLink(index)} size="small">
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )
}
