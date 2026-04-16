import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import EnhancedTaskForm from '../EnhancedTaskForm'
import type { User } from '../../api/tasksApi'
import type { TaskFormState, TaskFormActions } from '../../hooks/useTaskForm'

interface TaskCreateModalProps extends TaskFormState, TaskFormActions {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  loading: boolean
  workspaceUsers: User[]
}

export function TaskCreateModal({
  open,
  onClose,
  onSubmit,
  loading,
  workspaceUsers,
  // Form state
  title,
  description,
  status,
  priority,
  dueDate,
  selectedAssignees,
  checklistItems,
  links,
  newChecklistItem,
  newLink,
  // Form actions
  onTitleChange,
  onDescriptionChange,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssigneesChange,
  onChecklistItemsChange,
  onNewChecklistItemChange,
  onNewLinkChange,
  onAddChecklistItem,
  onRemoveChecklistItem,
  onAddLink,
  onRemoveLink,
}: TaskCreateModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>إنشاء مهمة جديدة</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <EnhancedTaskForm
          title={title}
          description={description}
          status={status}
          priority={priority}
          dueDate={dueDate}
          selectedAssignees={selectedAssignees}
          checklistItems={checklistItems}
          links={links}
          workspaceUsers={workspaceUsers}
          newChecklistItem={newChecklistItem}
          newLink={newLink}
          onTitleChange={onTitleChange}
          onDescriptionChange={onDescriptionChange}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onDueDateChange={onDueDateChange}
          onAssigneesChange={onAssigneesChange}
          onChecklistItemsChange={onChecklistItemsChange}
          onNewChecklistItemChange={onNewChecklistItemChange}
          onNewLinkChange={onNewLinkChange}
          onAddChecklistItem={onAddChecklistItem}
          onRemoveChecklistItem={onRemoveChecklistItem}
          onAddLink={onAddLink}
          onRemoveLink={onRemoveLink}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          إلغاء
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={!title.trim() || loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'إنشاء مهمة'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
