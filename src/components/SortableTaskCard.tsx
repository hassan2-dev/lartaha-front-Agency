import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Box } from '@mui/material'
import type { Task } from '../api/tasksApi'
import EnhancedTaskCard from './EnhancedTaskCard'

interface SortableTaskCardProps {
  task: Task
  onChecklistUpdate: (taskId: string, itemId: string, update: { completed?: boolean; text?: string }) => Promise<void>
  onSubtaskCreate?: (parentId: string) => void
  onTaskClick?: (task: Task) => void
}

export default function SortableTaskCard({
  task,
  onChecklistUpdate,
  onSubtaskCreate,
  onTaskClick,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        '&:hover': {
          cursor: 'grab',
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      <EnhancedTaskCard
        task={task}
        onChecklistUpdate={onChecklistUpdate}
        onSubtaskCreate={onSubtaskCreate}
        onTaskClick={onTaskClick}
      />
    </Box>
  )
}
