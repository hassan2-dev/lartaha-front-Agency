import { Box, Paper, Typography } from '@mui/material'
import { useDroppable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '../../api/tasksApi'
import { STATUS_LABEL } from '../../constants/tasks'
import SortableTaskCard from '../SortableTaskCard'

interface TaskColumnProps {
  status: TaskStatus
  tasks: Task[]
  overColumn: TaskStatus | null
  onChecklistUpdate: (
    taskId: string,
    itemId: string,
    update: { completed?: boolean; text?: string }
  ) => void
  onTaskClick: (task: Task) => void
}

export function TaskColumn({
  status,
  tasks,
  overColumn,
  onChecklistUpdate,
  onTaskClick,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const isHighlighted = isOver || overColumn === status

  return (
    <Paper
      elevation={0}
      ref={setNodeRef}
      sx={{
        p: 2,
        borderRadius: 2,
        flex: '1 1 280px',
        minHeight: 220,
        border: isHighlighted ? '2px solid #1976d2' : '1px solid rgba(25, 118, 210, 0.12)',
        bgcolor: isHighlighted ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
        transition: 'all 0.15s ease-in-out',
      }}
    >
      <Typography sx={{ fontWeight: 800, mb: 1 }}>{STATUS_LABEL[status]}</Typography>
      {tasks.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          لا توجد مهام
        </Typography>
      ) : (
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onChecklistUpdate={onChecklistUpdate}
                onTaskClick={onTaskClick}
              />
            ))}
          </Box>
        </SortableContext>
      )}
    </Paper>
  )
}
