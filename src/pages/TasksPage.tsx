import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import { createTask, deleteTask, getTasks, updateTask, type Task, type TaskStatus } from '../api/tasksApi'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  done: 'منجزة',
}

export default function TasksPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { toggle, mode } = useThemeMode()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل جلب المهام')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const grouped = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done'),
    }
  }, [tasks])

  async function onCreate() {
    setError(null)
    if (!title.trim()) {
      setError('يرجى كتابة عنوان المهمة')
      return
    }
    try {
      const t = await createTask({ title: title.trim(), description: description.trim(), status })
      setTasks((prev) => [t, ...prev])
      setTitle('')
      setDescription('')
      setStatus('todo')
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل إنشاء المهمة')
    }
  }

  async function onUpdate(id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'status'>>) {
    setError(null)
    try {
      const updated = await updateTask(id, patch)
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل تحديث المهمة')
    }
  }

  async function onDelete(id: string) {
    setError(null)
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? err.message ?? 'فشل حذف المهمة')
    }
  }

  function Column({ s }: { s: TaskStatus }) {
    const list = grouped[s]
    return (
      <Paper sx={{ p: 2, borderRadius: 3, flex: '1 1 280px', minHeight: 220 }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>{STATUS_LABEL[s]}</Typography>
        {list.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            لا توجد مهام
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {list.map((t) => (
              <Paper
                key={t.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <TextField
                  value={t.title}
                  onChange={(e) => onUpdate(t.id, { title: e.target.value })}
                  fullWidth
                  size="small"
                  label="العنوان"
                />
                <TextField
                  value={t.description ?? ''}
                  onChange={(e) => onUpdate(t.id, { description: e.target.value })}
                  fullWidth
                  size="small"
                  label="الوصف"
                  multiline
                  minRows={2}
                  sx={{ mt: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    select
                    size="small"
                    label="الحالة"
                    value={t.status}
                    onChange={(e) => onUpdate(t.id, { status: e.target.value as TaskStatus })}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="todo">{STATUS_LABEL.todo}</MenuItem>
                    <MenuItem value="in_progress">{STATUS_LABEL.in_progress}</MenuItem>
                    <MenuItem value="done">{STATUS_LABEL.done}</MenuItem>
                  </TextField>
                  <Box sx={{ flex: '1 1 auto' }} />
                  <Button color="error" variant="text" onClick={() => onDelete(t.id)} sx={{ borderRadius: 999 }}>
                    حذف
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    )
  }

  return (
    <Box sx={{ height: '100%' }}>
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

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>إنشاء مهمة جديدة</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: '2 1 260px' }} />
            <TextField
              label="الوصف"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ flex: '3 1 320px' }}
            />
            <TextField
              select
              label="الحالة"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              sx={{ width: 190 }}
            >
              <MenuItem value="todo">{STATUS_LABEL.todo}</MenuItem>
              <MenuItem value="in_progress">{STATUS_LABEL.in_progress}</MenuItem>
              <MenuItem value="done">{STATUS_LABEL.done}</MenuItem>
            </TextField>
            <Button variant="contained" onClick={onCreate} sx={{ borderRadius: 999, px: 3 }}>
              إضافة
            </Button>
            <Button variant="outlined" onClick={refresh} disabled={loading} sx={{ borderRadius: 999, px: 3 }}>
              تحديث
            </Button>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <Column s="todo" />
          <Column s="in_progress" />
          <Column s="done" />
        </Box>
      </Container>
    </Box>
  )
}

