import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Toolbar,
  Typography,
  Fab,
  CircularProgress,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import ArrowBackIcon from '@mui/icons-material/ArrowBackIosNew'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import {
  createTask,
  getTasks,
  updateTask,
  getWorkspaceUsers,
  updateChecklistItem,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type User,
} from '../api/tasksApi'
import { subscribeRealtime } from '../api/realtimeApi'
import EnhancedTaskForm from '../components/EnhancedTaskForm'
import EnhancedTaskCard from '../components/EnhancedTaskCard'
import SortableTaskCard from '../components/SortableTaskCard'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  done: 'منجزة',
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done']

export default function TasksPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { toggle, mode } = useThemeMode()

  const [tasks, setTasks] = useState<Task[]>([])
  const [workspaceUsers, setWorkspaceUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Basic task fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')

  // Enhanced task features
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<{ text: string; completed?: boolean }[]>([])
  const [links, setLinks] = useState<{ url: string; title?: string }[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newLink, setNewLink] = useState({ url: '', title: '' })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true

    if (!silent) {
      setError(null)
      setLoading(true)
    }

    try {
      const [tasksData, usersData] = await Promise.all([getTasks(), getWorkspaceUsers()])
      setTasks(tasksData)
      setWorkspaceUsers(usersData)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل جلب المهام')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      (event) => {
        if (event.scope !== 'tasks') return
        void refresh({ silent: true })
      },
      () => {
        // keep UI functional even if realtime stream disconnects
      }
    )

    return unsubscribe
  }, [refresh])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStatus('todo')
    setPriority('medium')
    setDueDate('')
    setSelectedAssignees([])
    setChecklistItems([])
    setLinks([])
    setNewChecklistItem('')
    setNewLink({ url: '', title: '' })
  }

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, { text: newChecklistItem.trim(), completed: false }])
      setNewChecklistItem('')
    }
  }

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index))
  }

  const addLink = () => {
    if (newLink.url.trim()) {
      setLinks([...links, { url: newLink.url.trim(), title: newLink.title.trim() }])
      setNewLink({ url: '', title: '' })
    }
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const grouped = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done'),
    }
  }, [tasks])

  async function onCreate() {
    const isEditing = Boolean(selectedTask)

    setError(null)
    setLoading(true)
    if (!title.trim()) {
      setError('يرجى كتابة عنوان المهمة')
      setLoading(false)
      return
    }
    try {
      const effectiveAssigneeIds = isEditing
        ? selectedAssignees
        : Array.from(
          new Set([
            ...selectedAssignees,
            ...(!user?.isAdmin && user?.id ? [user.id] : []),
          ])
        )

      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds: effectiveAssigneeIds.length > 0 ? effectiveAssigneeIds : undefined,
        checklists: checklistItems.length > 0 ? checklistItems : undefined,
        links: links.length > 0 ? links : undefined,
      }

      if (isEditing && selectedTask) {
        // Update existing task
        const updated = await updateTask(selectedTask.id, taskData)
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updated : t)))
        closeEditModal()
      } else {
        // Create new task
        const t = await createTask(taskData)
        setTasks((prev) => [t, ...prev])
        closeCreateModal()
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? (isEditing ? 'فشل تحديث المهمة' : 'فشل إنشاء المهمة'))
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setSelectedTask(null)
    resetForm()
    setCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setCreateModalOpen(false)
    setSelectedTask(null)
    resetForm()
  }

  const openEditModal = (task: Task) => {
    setSelectedTask(task)
    setTitle(task.title)
    setDescription(task.description || '')
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.dueDate || '')
    setSelectedAssignees(task.assignees?.map(a => a.userId) || [])
    setChecklistItems(task.checklists?.map(c => ({ text: c.text, completed: c.completed })) || [])
    setLinks(task.links?.map(l => ({ url: l.url, title: l.title || '' })) || [])
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setSelectedTask(null)
    resetForm()
  }

  async function handleSubtaskCreate(parentId: string) {
    // For now, we'll just log this. In a full implementation, you'd open a dialog or form
    console.log('Create subtask for parent:', parentId)
  }

  async function handleChecklistUpdate(taskId: string, itemId: string, update: { completed?: boolean; text?: string }) {
    setError(null)
    try {
      await updateChecklistItem(taskId, itemId, update)
      await refresh()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل تحديث عنصر قائمة التحقق')
    }
  }

  const reorderTasks = useCallback(
    (current: Task[], movingTaskId: string, toStatus: TaskStatus, targetIndex?: number) => {
      const movingTask = current.find((item) => item.id === movingTaskId)
      if (!movingTask) return current

      const remaining = current.filter((item) => item.id !== movingTaskId)
      const groupedByStatus: Record<TaskStatus, Task[]> = {
        todo: [],
        in_progress: [],
        done: [],
      }

      remaining.forEach((item) => {
        groupedByStatus[item.status].push(item)
      })

      const movedTask: Task = { ...movingTask, status: toStatus }
      const targetList = groupedByStatus[toStatus]
      const insertIndex = targetIndex !== undefined ? targetIndex : targetList.length

      targetList.splice(insertIndex, 0, movedTask)

      return STATUS_ORDER.flatMap((statusKey) => groupedByStatus[statusKey])
    },
    []
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverColumn(null)
      return
    }
    // Check if we're over a column (droppable ID that matches a status)
    const overId = over.id as string
    if (STATUS_ORDER.includes(overId as TaskStatus)) {
      setOverColumn(overId as TaskStatus)
    } else {
      // We're over a task, find its status
      const task = tasks.find(t => t.id === overId)
      if (task) {
        setOverColumn(task.status)
      }
    }
  }, [tasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setOverColumn(null)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumn(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    // Determine target status
    let targetStatus: TaskStatus
    const overTask = tasks.find((t) => t.id === overId)

    if (overTask) {
      targetStatus = overTask.status
    } else if (STATUS_ORDER.includes(overId as TaskStatus)) {
      // Dropped on a column (not a task)
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
      nextTasks = arrayMove(
        tasks,
        tasks.findIndex(t => t.id === activeId),
        tasks.findIndex(t => t.id === overId)
      )
    } else {
      // Moving to different column or new position
      const targetIndex = overTask ? newIndex : currentStatusTasks.length
      nextTasks = reorderTasks(tasks, activeId, targetStatus, targetIndex)
    }

    const previousTasks = tasks
    setTasks(nextTasks)

    // Only update if status changed
    if (activeTask.status !== targetStatus) {
      setError(null)
      try {
        const updated = await updateTask(activeId, { status: targetStatus })
        setTasks((current) => current.map((item) => (item.id === activeId ? updated : item)))
      } catch (e: unknown) {
        setTasks(previousTasks)
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل تحديث حالة المهمة')
      }
    }
  }, [tasks, reorderTasks])

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId])

  function DroppableColumn({ s }: { s: TaskStatus }) {
    const list = grouped[s]
    const { setNodeRef, isOver } = useDroppable({
      id: s,
    })

    const isHighlighted = isOver || overColumn === s

    return (
      <Paper
        ref={setNodeRef}
        sx={{
          p: 2,
          borderRadius: 3,
          flex: '1 1 280px',
          minHeight: 220,
          border: isHighlighted
            ? '2px solid #42a5f5'
            : '1px solid rgba(255,255,255,0.08)',
          bgcolor: isHighlighted
            ? 'rgba(66,165,245,0.08)'
            : 'background.paper',
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <Typography sx={{ fontWeight: 800, mb: 1 }}>{STATUS_LABEL[s]}</Typography>
        {list.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            لا توجد مهام
          </Typography>
        ) : (
          <SortableContext items={list.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {list.map((t) => (
                <SortableTaskCard
                  key={t.id}
                  task={t}
                  onChecklistUpdate={handleChecklistUpdate}
                  onSubtaskCreate={handleSubtaskCreate}
                  onTaskClick={openEditModal}
                />
              ))}
            </Box>
          </SortableContext>
        )}
      </Paper>
    )
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'inherit',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/')} color="inherit" aria-label="رجوع">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              المهام
            </Typography>
            <Button
              variant="contained"
              onClick={openCreateModal}
              startIcon={<AddIcon />}
              sx={{ ml: 2 }}
            >
              مهمة جديدة
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="text" onClick={toggle} sx={{ borderRadius: 999 }}>
              {mode === 'dark' ? 'فاتح' : 'داكن'}
            </Button>
            <IconButton
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              color="inherit"
              aria-label="تسجيل الخروج"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <DroppableColumn s="todo" />
            <DroppableColumn s="in_progress" />
            <DroppableColumn s="done" />
          </Box>
          <DragOverlay>
            {activeTask ? (
              <Box sx={{ transform: 'rotate(2deg)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <EnhancedTaskCard
                  task={activeTask}
                  onChecklistUpdate={handleChecklistUpdate}
                  onSubtaskCreate={handleSubtaskCreate}
                  onTaskClick={openEditModal}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        onClick={openCreateModal}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <AddIcon />
      </Fab>

      {/* Create Task Modal */}
      <Dialog
        open={createModalOpen}
        onClose={closeCreateModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          إنشاء مهمة جديدة
        </DialogTitle>
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
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onStatusChange={setStatus}
            onPriorityChange={setPriority}
            onDueDateChange={setDueDate}
            onAssigneesChange={setSelectedAssignees}
            onChecklistItemsChange={setChecklistItems}
            onNewChecklistItemChange={setNewChecklistItem}
            onNewLinkChange={setNewLink}
            onAddChecklistItem={addChecklistItem}
            onRemoveChecklistItem={removeChecklistItem}
            onAddLink={addLink}
            onRemoveLink={removeLink}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeCreateModal} color="inherit" disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={onCreate} variant="contained" disabled={!title.trim() || loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'إنشاء مهمة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog
        open={editModalOpen}
        onClose={closeEditModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {selectedTask ? 'تعديل المهمة' : 'عرض تفاصيل المهمة'}
        </DialogTitle>
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
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onStatusChange={setStatus}
            onPriorityChange={setPriority}
            onDueDateChange={setDueDate}
            onAssigneesChange={setSelectedAssignees}
            onChecklistItemsChange={setChecklistItems}
            onNewChecklistItemChange={setNewChecklistItem}
            onNewLinkChange={setNewLink}
            onAddChecklistItem={addChecklistItem}
            onRemoveChecklistItem={removeChecklistItem}
            onAddLink={addLink}
            onRemoveLink={removeLink}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeEditModal} color="inherit" disabled={loading}>
            إلغاء
          </Button>
          {selectedTask && (
            <Button onClick={onCreate} variant="contained" disabled={!title.trim() || loading}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'حفظ التغييرات'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

