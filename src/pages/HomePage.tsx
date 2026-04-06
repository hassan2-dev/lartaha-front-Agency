import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  CloudUpload,
  ClipboardText,
  AddSquare,
  ClockCircle,
  FolderOpen,
  Bolt,
} from '@solar-icons/react'
import { createTask, getTasks, type Task } from '../api/tasksApi'
import { listUploadedObjects, uploadFiles } from '../api/uploadApi'

export default function HomePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [tasks, setTasks] = useState<Task[]>([])
  const [filesCount, setFilesCount] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const [tasksResult, filesResult] = await Promise.all([
        getTasks(),
        listUploadedObjects('', 1000, false),
      ])
      setTasks(tasksResult.tasks)
      setFilesCount(filesResult.objects?.length ?? 0)
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: { message?: string } } }
      setStatsError(err.response?.data?.message ?? err.message ?? 'تعذر تحميل بيانات لوحة التحكم')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const activeTasks = tasks.filter((task) => task.status !== 'done').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const dueSoonCount = useMemo(() => {
    const now = new Date()
    const threeDaysLater = new Date()
    threeDaysLater.setDate(now.getDate() + 3)

    return tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false
      const dueDate = new Date(task.dueDate)
      return dueDate >= now && dueDate <= threeDaysLater
    }).length
  }, [tasks])

  const overviewCards = [
    {
      title: 'المهام النشطة',
      value: String(activeTasks),
      note: `${totalTasks} إجمالي المهام`,
      color: 'primary.main',
    },
    {
      title: 'نسبة الإنجاز',
      value: `${completionRate}%`,
      note: `${completedTasks} مهمة مكتملة`,
      color: 'success.main',
    },
    {
      title: 'ملفات مرفوعة',
      value: String(filesCount),
      note: 'من مساحة العمل الحالية',
      color: 'info.main',
    },
    {
      title: 'مواعيد قريبة',
      value: String(dueSoonCount),
      note: 'خلال الأيام الثلاثة القادمة',
      color: 'warning.main',
    },
  ]

  const openCreateTaskDialog = () => {
    setActionFeedback(null)
    setCreateTaskOpen(true)
  }

  const closeCreateTaskDialog = () => {
    if (creatingTask) return
    setCreateTaskOpen(false)
    setNewTaskTitle('')
    setNewTaskDescription('')
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      setActionFeedback({ type: 'error', message: 'يرجى إدخال عنوان المهمة' })
      return
    }

    setCreatingTask(true)
    setActionFeedback(null)
    try {
      const createdTask = await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        status: 'todo',
        priority: 'medium',
      })
      setTasks((prev) => [createdTask, ...prev])
      setCreateTaskOpen(false)
      setNewTaskTitle('')
      setNewTaskDescription('')
      setActionFeedback({ type: 'success', message: 'تم إنشاء المهمة بنجاح' })
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: { message?: string } } }
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message ?? err.message ?? 'فشل إنشاء المهمة',
      })
    } finally {
      setCreatingTask(false)
    }
  }

  const openFilePicker = () => {
    setActionFeedback(null)
    fileInputRef.current?.click()
  }

  const handleUploadFromDashboard = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) return

    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file, file.name)
    }

    setUploading(true)
    setUploadProgress(0)
    setActionFeedback(null)
    try {
      const result = await uploadFiles(formData, (progressPercent) => {
        setUploadProgress(progressPercent)
      })
      const uploadedCount = result.uploaded?.length ?? files.length
      setActionFeedback({
        type: 'success',
        message: `تم رفع ${uploadedCount} ملف بنجاح`,
      })
      await fetchStats()
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: { message?: string } } }
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message ?? err.message ?? 'فشل رفع الملفات',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const quickActions = [
    {
      title: 'مهمة جديدة',
      description: 'أضف مهمة بسرعة وحدد الأولوية والمسؤول',
      icon: <AddSquare size={34} />,
      action: openCreateTaskDialog,
      color: 'primary.main',
      disabled: creatingTask,
    },
    {
      title: 'رفع ملف',
      description: 'ارفع ملفات المشروع مباشرة إلى المساحة المشتركة',
      icon: <CloudUpload size={40} />,
      action: openFilePicker,
      color: 'info.main',
      disabled: uploading,
    },
    {
      title: 'متابعة المهام',
      description: 'راجع حالة التنفيذ والمهام المتأخرة',
      icon: <ClipboardText size={40} />,
      action: () => navigate('/dashboard/tasks'),
      color: 'success.main',
    },
    {
      title: 'عرض الأنشطة',
      description: 'اطلع على أحدث التحديثات وحركة الفريق',
      icon: <ClockCircle size={40} />,
      action: () => navigate('/dashboard/activity'),
      color: 'warning.main',
      disabled: false,
    },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleUploadFromDashboard}
      />

      {actionFeedback ? (
        <Alert severity={actionFeedback.type} sx={{ mb: 2 }}>
          {actionFeedback.message}
        </Alert>
      ) : null}

      {statsError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {statsError}
        </Alert>
      ) : null}

      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.14)',
          background:
            'radial-gradient(circle at 15% 10%, rgba(25,118,210,0.2), transparent 45%), radial-gradient(circle at 85% 0%, rgba(46,125,50,0.2), transparent 40%), rgba(255,255,255,0.02)',
          backdropFilter: 'blur(6px)',
        }}
      >


        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          نظرة سريعة على بياناتك اليومية
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.82, maxWidth: 780, mb: 3 }}>
          هذه الصفحة تمنحك ملخصاً سريعاً عن حالة المهام والملفات، مع اختصارات مباشرة لتنفيذ أهم الإجراءات بدون التنقل بين الصفحات.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddSquare />}
            onClick={openCreateTaskDialog}
            sx={{ borderRadius: 999, px: 3.5, gap: 1 }}
            disabled={creatingTask}
          >
            مهمة جديدة
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<CloudUpload />}
            onClick={openFilePicker}
            sx={{ borderRadius: 999, px: 3.5, gap: 1 }}
            disabled={uploading}
          >
            رفع ملف
          </Button>
        </Box>

        {uploading ? (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              جاري رفع الملفات... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.8, height: 6, borderRadius: 999 }} />
          </Box>
        ) : null}
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
          ملخص البيانات
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {overviewCards.map((item) => (
            <Card
              key={item.title}
              sx={{
                borderRadius: 2,
                border: '1px solid rgb(226, 232, 240)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.72, mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: item.color, mb: 0.5 }}>
                  {loadingStats ? '...' : item.value}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.72 }}>
                  {item.note}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <Box sx={{ color: 'warning.main', display: 'flex' }}>
            <Bolt size={24} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            إجراءات سريعة
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {quickActions.map((action) => (
            <Card
              key={action.title}
              onClick={action.disabled ? undefined : action.action}
              sx={{
                borderRadius: 2,
                border: '1px solid rgb(226, 232, 240)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                opacity: action.disabled ? 0.65 : 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgb(203, 213, 225)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color: action.color,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    flexShrink: 0,
                  }}
                >
                  {action.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    {action.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.12)',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ color: 'info.main', display: 'flex' }}>
            <FolderOpen size={24} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            لمحة إنتاجية اليوم
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
          تم إنجاز {completedTasks} من أصل {totalTasks} مهمة، وعدد الملفات المتاحة حالياً {filesCount}. استمر بهذا المعدل للوصول لهدف الأسبوع.
        </Typography>
        <LinearProgress
          variant="determinate"
          value={completionRate}
          sx={{ height: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}
        />
      </Paper>

      <Dialog
        open={createTaskOpen}
        onClose={closeCreateTaskDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء مهمة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="عنوان المهمة"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="الوصف (اختياري)"
            value={newTaskDescription}
            onChange={(event) => setNewTaskDescription(event.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeCreateTaskDialog} disabled={creatingTask} color="inherit">
            إلغاء
          </Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={creatingTask || !newTaskTitle.trim()}>
            {creatingTask ? <CircularProgress size={18} color="inherit" /> : 'إنشاء المهمة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
