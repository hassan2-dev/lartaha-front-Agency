import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Box } from '@mui/material'
import type { Task } from '../api/tasksApi'
import EnhancedTaskCard from './EnhancedTaskCard'

interface SortableTaskCardProps {
  task: Task
  onChecklistUpdate: (taskId: string, itemId: string, update: { completed?: boolean; text?: string }) => Promise<void>
  onTaskClick?: (task: Task) => void
}

export default function SortableTaskCard({
  task,
  onChecklistUpdate,
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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Store mouse down position to detect drag vs click
    const startX = e.clientX
    const startY = e.clientY

    const handleMouseUp = (upEvent: MouseEvent) => {
      const endX = upEvent.clientX
      const endY = upEvent.clientY
      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))

      // If moved less than 5 pixels, consider it a click
      if (distance < 5 && onTaskClick) {
        onTaskClick(task)
      }

      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mouseup', handleMouseUp)
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
      onMouseDown={handleMouseDown}
    >
      <EnhancedTaskCard
        task={task}
        onChecklistUpdate={onChecklistUpdate}
        onTaskClick={undefined} // Disable internal click handler, we handle it here
      />
    </Box>
  )
}
