import { useCallback, useMemo, useRef } from 'react'
import { DndContext, pointerWithin, DragOverlay } from '@dnd-kit/core'
import { Box, Container, Fab, Typography, CircularProgress } from '@mui/material'
import { AddSquare } from '@solar-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { createTask, updateTask, deleteTask, type Task, type TaskStatus } from '../api/tasksApi'
import { invalidateTasksCache } from '../lib/explorerCache'
import { useTasks } from '../hooks/useTasks'
import { useTaskForm } from '../hooks/useTaskForm'
import { useTaskModals } from '../hooks/useTaskModals'
import { useTaskDragAndDrop } from '../hooks/useTaskDragAndDrop'
import { canEditTask, getEffectiveAssigneeIds } from '../utils/taskUtils'
import { STATUS_ORDER } from '../constants/tasks'
import { TaskColumn, TaskCreateModal, TaskEditModal } from '../components/tasks'
import EnhancedTaskCard from '../components/EnhancedTaskCard'
import { ColumnSkeleton } from '../components/SkeletonLoaders'
import Toast from '../components/Toast'

export default function TasksPage() {
  const { user } = useAuth()

  // Data fetching hook
  const {
    tasks,
    groupedTasks,
    workspaceUsers,
    loading,
    isLoadingMore,
    hasMore,
    error,
    setTasks,
    setError,
    loadMore,
    handleChecklistUpdate,
  } = useTasks({
    workspaceId: user?.workspaceId,
    workspaceName: user?.workspaceName,
  })

  // Form state hook
  const form = useTaskForm()

  // Modal state hook
  const modals = useTaskModals(form.resetForm)

  // Permission helper
  const checkCanEditTask = useCallback(
    (task: Task) => canEditTask(task, user?.id, user?.isAdmin),
    [user?.id, user?.isAdmin]
  )

  // Error handling
  const handleError = useCallback(
    (message: string) => {
      setError(message)
    },
    [setError]
  )

  // Status change handler for drag and drop
  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const updated = await updateTask(taskId, { status: newStatus })
      setTasks(current => current.map(item => (item.id === taskId ? updated : item)))
    },
    [setTasks]
  )

  // Drag and drop hook
  const dragAndDrop = useTaskDragAndDrop({
    tasks,
    onTasksChange: setTasks,
    onStatusChange: handleStatusChange,
    canEditTask: checkCanEditTask,
    onError: handleError,
  })

  // Scroll container ref for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      // When user is within 200px of bottom, load more
      if (scrollHeight - scrollTop - clientHeight < 200) {
        void loadMore()
      }
    },
    [loadMore]
  )

  // Task creation/editing handler
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleSubmit = useCallback(async () => {
    const isEditing = Boolean(modals.selectedTask)

    setError(null)

    if (!form.title.trim()) {
      setError('يرجى كتابة عنوان المهمة')
      return
    }

    try {
      const effectiveAssigneeIds = getEffectiveAssigneeIds(
        form.selectedAssignees,
        user?.id,
        user?.isAdmin,
        isEditing
      )

      const taskData = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assigneeIds: effectiveAssigneeIds.length > 0 ? effectiveAssigneeIds : undefined,
        checklists: form.checklistItems.length > 0 ? form.checklistItems : undefined,
        links: form.links.length > 0 ? form.links : undefined,
      }

      if (isEditing && modals.selectedTask) {
        const updated = await updateTask(modals.selectedTask.id, taskData)
        if (user?.workspaceId) void invalidateTasksCache(user.workspaceId)
        setTasks(prev => prev.map(t => (t.id === modals.selectedTask!.id ? updated : t)))
        modals.closeEditModal()
      } else {
        const newTask = await createTask(taskData)
        if (user?.workspaceId) void invalidateTasksCache(user.workspaceId)
        setTasks(prev => [newTask, ...prev])
        modals.closeCreateModal()
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(
        err.response?.data?.message ??
        err.message ??
        (isEditing ? 'فشل تحديث المهمة' : 'فشل إنشاء المهمة')
      )
    }
  }, [form, modals, user?.id, user?.isAdmin, setTasks, setError])

  // Task deletion handler
  const handleDelete = useCallback(async () => {
    if (!modals.selectedTask) return

    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف المهمة "${modals.selectedTask.title}"؟ هذا الإجراء لا يمكن التراجع عنه.`
    )
    if (!confirmDelete) return

    setError(null)
    try {
      await deleteTask(modals.selectedTask.id)
      if (user?.workspaceId) void invalidateTasksCache(user.workspaceId)
      setTasks(prev => prev.filter(t => t.id !== modals.selectedTask!.id))
      modals.closeEditModal()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل حذف المهمة')
    }
  }, [modals.selectedTask, setTasks, setError, modals])

  // Task click handler (opens edit modal with permission check)
  const handleTaskClick = useCallback(
    (task: Task) => {
      if (!checkCanEditTask(task)) {
        setError(
          'لا يمكنك تعديل هذه المهمة. فقط المسؤول أو منشئ المهمة أو الأعضاء المعينين يمكنهم التعديل.'
        )
        return
      }
      form.populateFromTask(task)
      modals.openEditModal(task)
    },
    [checkCanEditTask, form, modals, setError]
  )

  // Mobile detection
  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    )
  }, [])

  // Render columns
  const renderColumns = () => (
    <>
      {STATUS_ORDER.map(status => (
        <TaskColumn
          key={status}
          status={status}
          tasks={groupedTasks[status]}
          overColumn={dragAndDrop.overColumn}
          onChecklistUpdate={handleChecklistUpdate}
          onTaskClick={handleTaskClick}
        />
      ))}
    </>
  )

  // Render skeleton loaders
  const renderSkeletons = () => (
    <>
      <ColumnSkeleton />
      <ColumnSkeleton />
      <ColumnSkeleton />
    </>
  )

  return (
    <Container
      ref={scrollContainerRef}
      maxWidth="lg"
      sx={{ py: 3, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      {isMobile ? (
        // Mobile view - no drag and drop
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          {loading && tasks.length === 0 ? renderSkeletons() : renderColumns()}
        </Box>
      ) : (
        // Desktop view - with drag and drop
        <DndContext
          sensors={dragAndDrop.sensors}
          collisionDetection={pointerWithin}
          onDragStart={dragAndDrop.handleDragStart}
          onDragOver={dragAndDrop.handleDragOver}
          onDragEnd={dragAndDrop.handleDragEnd}
        >
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {loading && tasks.length === 0 ? renderSkeletons() : renderColumns()}
          </Box>
          <DragOverlay>
            {dragAndDrop.activeTask ? (
              <Box
                sx={{
                  transform: 'rotate(2deg)',
                  border: '1px solid rgba(25, 118, 210, 0.2)',
                }}
              >
                <EnhancedTaskCard
                  task={dragAndDrop.activeTask}
                  onChecklistUpdate={handleChecklistUpdate}
                  onTaskClick={handleTaskClick}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Infinite Scroll Loading Indicator */}
      {isLoadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
            جاري تحميل المزيد من المهام...
          </Typography>
        </Box>
      )}

      {!hasMore && tasks.length > 0 && (
        <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.5, mt: 2, mb: 2 }}>
          تم تحميل جميع المهام
        </Typography>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        onClick={modals.openCreateModal}
        className="left-8 bottom-24 md:left-16 md:bottom-10"
        sx={{
          position: 'fixed',
          zIndex: 1000,
          border: '1px solid rgba(25, 118, 210, 0.2)',
          '&:hover': {
            transform: 'scale(1.05)',
            border: '1px solid rgba(25, 118, 210, 0.4)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <AddSquare size={24} />
      </Fab>

      {/* Create Task Modal */}
      <TaskCreateModal
        open={modals.isCreateOpen}
        onClose={modals.closeCreateModal}
        onSubmit={handleSubmit}
        loading={loading}
        workspaceUsers={workspaceUsers}
        {...form}
      />

      {/* Edit Task Modal */}
      <TaskEditModal
        open={modals.isEditOpen}
        onClose={modals.closeEditModal}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        loading={loading}
        selectedTask={modals.selectedTask}
        workspaceUsers={workspaceUsers}
        canEdit={modals.selectedTask ? checkCanEditTask(modals.selectedTask) : false}
        {...form}
      />

      {/* Toast Notification */}
      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => {
            setError(null)
          }}
        />
      )}
    </Container>
  )
}
