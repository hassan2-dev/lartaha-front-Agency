import { useMemo, useState, useCallback } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '../api/tasksApi'
import { reorderTasks } from '../utils/taskUtils'

export interface UseTaskDragAndDropOptions {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  canEditTask: (task: Task) => boolean
  onError: (message: string) => void
}

export interface UseTaskDragAndDropReturn {
  sensors: ReturnType<typeof useSensors>
  activeId: string | null
  overColumn: TaskStatus | null
  activeTask: Task | undefined
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
}

export function useTaskDragAndDrop(options: UseTaskDragAndDropOptions): UseTaskDragAndDropReturn {
  const { tasks, onTasksChange, onStatusChange, canEditTask, onError } = options

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  // Detect mobile devices
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    )
  }, [])

  // Always call hooks in the same order
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 500,
      tolerance: 5,
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    // Only include TouchSensor on non-mobile devices to block dragging on mobile
    ...(isMobile ? [] : [touchSensor]),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setOverColumn(null)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event
      if (!over) {
        setOverColumn(null)
        return
      }

      const overId = over.id as string
      const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'done']

      if (statusOrder.includes(overId as TaskStatus)) {
        setOverColumn(overId as TaskStatus)
      } else {
        const task = tasks.find(t => t.id === overId)
        if (task) {
          setOverColumn(task.status)
        }
      }
    },
    [tasks]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setOverColumn(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeTask = tasks.find(t => t.id === activeId)
      if (!activeTask) return

      // Check permissions
      if (!canEditTask(activeTask)) {
        onError('لا يمكنك تعديل هذه المهمة. فقط المسؤول أو منشئ المهمة يمكنه التعديل.')
        return
      }

      // Determine target status
      let targetStatus: TaskStatus
      const overTask = tasks.find(t => t.id === overId)
      const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'done']

      if (overTask) {
        targetStatus = overTask.status
      } else if (statusOrder.includes(overId as TaskStatus)) {
        targetStatus = overId as TaskStatus
      } else {
        return
      }

      if (activeId === overId) return

      const currentStatusTasks = tasks.filter(t => t.status === targetStatus)
      const newIndex = currentStatusTasks.findIndex(t => t.id === overId)

      let nextTasks: Task[]
      if (overTask && activeTask.status === targetStatus) {
        // Reordering within same column
        const targetIndex = tasks.findIndex(t => t.id === overId)
        nextTasks = reorderTasks(tasks, activeId, targetStatus, targetIndex)
      } else {
        // Moving to different column or new position
        const targetIndex = overTask ? newIndex : currentStatusTasks.length
        nextTasks = reorderTasks(tasks, activeId, targetStatus, targetIndex)
      }

      const previousTasks = tasks
      onTasksChange(nextTasks)

      // Only update if status changed
      if (activeTask.status !== targetStatus) {
        try {
          await onStatusChange(activeId, targetStatus)
        } catch {
          onTasksChange(previousTasks)
        }
      }
    },
    [tasks, onTasksChange, onStatusChange, canEditTask, onError]
  )

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId])

  return {
    sensors,
    activeId,
    overColumn,
    activeTask,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
