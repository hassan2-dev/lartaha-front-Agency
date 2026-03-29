import { useCallback, useEffect, useMemo, useState } from 'react'
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  // UI state
  // const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

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
    (current: Task[], movingTaskId: string, toStatus: TaskStatus, beforeTaskId?: string | null) => {
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
      const insertIndex = beforeTaskId ? targetList.findIndex((item) => item.id === beforeTaskId) : -1

      if (insertIndex >= 0) {
        targetList.splice(insertIndex, 0, movedTask)
      } else {
        targetList.push(movedTask)
      }

      return STATUS_ORDER.flatMap((statusKey) => groupedByStatus[statusKey])
    },
    []
  )

  const handleTaskDragStart = (taskId: string, event: React.DragEvent) => {
    setDraggedTaskId(taskId)
    setDropTargetStatus(null)
    setDragOverTaskId(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', taskId)
  }

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null)
    setDropTargetStatus(null)
    setDragOverTaskId(null)
  }

  const resolveDraggedTaskId = (event: React.DragEvent) => {
    const transferId = event.dataTransfer.getData('text/plain')
    return draggedTaskId || transferId || null
  }

  const handleColumnDragOver = (status: TaskStatus, event: React.DragEvent) => {
    event.preventDefault()
    if (dropTargetStatus !== status) {
      setDropTargetStatus(status)
    }
  }

  const handleColumnDrop = async (status: TaskStatus, event: React.DragEvent) => {
    event.preventDefault()

    const taskId = resolveDraggedTaskId(event)
    setDropTargetStatus(null)
    setDragOverTaskId(null)
    setDraggedTaskId(null)

    if (!taskId) return

    const sourceTask = tasks.find((item) => item.id === taskId)
    if (!sourceTask || sourceTask.status === status) return

    const previousTasks = tasks
    const optimisticTasks = reorderTasks(tasks, taskId, status, null)

    setTasks(optimisticTasks)
    setError(null)

    try {
      const updated = await updateTask(taskId, { status })
      setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)))
    } catch (e: unknown) {
      setTasks(previousTasks)
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل تحديث حالة المهمة')
    }
  }

  const handleTaskDragOver = (status: TaskStatus, taskId: string, event: React.DragEvent) => {
    event.preventDefault()
    setDropTargetStatus(status)
    if (dragOverTaskId !== taskId) {
      setDragOverTaskId(taskId)
    }
  }

  const handleTaskDropOnTask = async (status: TaskStatus, targetTaskId: string, event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const movingTaskId = resolveDraggedTaskId(event)
    setDropTargetStatus(null)
    setDragOverTaskId(null)
    setDraggedTaskId(null)

    if (!movingTaskId || movingTaskId === targetTaskId) return

    const sourceTask = tasks.find((item) => item.id === movingTaskId)
    if (!sourceTask) return

    const previousTasks = tasks
    const nextTasks = reorderTasks(tasks, movingTaskId, status, targetTaskId)
    setTasks(nextTasks)

    if (sourceTask.status !== status) {
      try {
        const updated = await updateTask(movingTaskId, { status })
        setTasks((current) => current.map((item) => (item.id === movingTaskId ? updated : item)))
      } catch (e: unknown) {
        setTasks(previousTasks)
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? err.message ?? 'فشل تحديث حالة المهمة')
      }
    }
  }

  function Column({ s }: { s: TaskStatus }) {
    const list = grouped[s]
    return (
      <Paper
        onDragOver={(event) => handleColumnDragOver(s, event)}
        onDrop={(event) => void handleColumnDrop(s, event)}
        onDragLeave={() => {
          if (dropTargetStatus === s) {
            setDropTargetStatus(null)
          }
        }}
        sx={{
          p: 2,
          borderRadius: 3,
          flex: '1 1 280px',
          minHeight: 220,
          border: dropTargetStatus === s ? '2px dashed #42a5f5' : '1px solid rgba(255,255,255,0.08)',
          bgcolor: dropTargetStatus === s ? 'rgba(66,165,245,0.08)' : 'background.paper',
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <Typography sx={{ fontWeight: 800, mb: 1 }}>{STATUS_LABEL[s]}</Typography>
        {list.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            لا توجد مهام
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {list.map((t) => (
              <Box
                key={t.id}
                draggable
                onDragStart={(event) => handleTaskDragStart(t.id, event)}
                onDragEnd={handleTaskDragEnd}
                onDragOver={(event) => handleTaskDragOver(s, t.id, event)}
                onDrop={(event) => void handleTaskDropOnTask(s, t.id, event)}
                sx={{
                  opacity: draggedTaskId === t.id ? 0.45 : 1,
                  cursor: 'grab',
                  borderTop: dragOverTaskId === t.id ? '2px solid #42a5f5' : '2px solid transparent',
                  borderRadius: 1,
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, pb: 0.5, opacity: 0.65 }}>
                  <DragIndicatorIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">اسحب لإعادة الترتيب</Typography>
                </Box>
                <EnhancedTaskCard
                  task={t}
                  onChecklistUpdate={handleChecklistUpdate}
                  onSubtaskCreate={handleSubtaskCreate}
                  onTaskClick={openEditModal}
                />
              </Box>
            ))}
          </Box>
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

        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <Column s="todo" />
          <Column s="in_progress" />
          <Column s="done" />
        </Box>
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

