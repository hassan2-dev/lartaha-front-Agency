import { Alert, Container } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { CloudUpload, ClipboardText, AddSquare, ClockCircle } from '@solar-icons/react'
import { useDashboardStats, useTaskCreation, useFileUpload } from '../hooks/dashboard'
import { generateOverviewCards } from '../utils/dashboard/calculations'
import {
  WelcomeBanner,
  StatsOverview,
  QuickActions,
  ProductivitySummary,
  CreateTaskDialog,
  FeedbackAlert,
} from '../components/dashboard'

export default function HomePage() {
  const navigate = useNavigate()

  // Stats hook
  const { stats, loading: loadingStats, error: statsError, refreshStats } = useDashboardStats()

  // Task creation hook
  const {
    isOpen: createTaskOpen,
    title: newTaskTitle,
    description: newTaskDescription,
    isCreating: creatingTask,
    feedback: taskFeedback,
    openDialog: openCreateTaskDialog,
    closeDialog: closeCreateTaskDialog,
    setTitle: setNewTaskTitle,
    setDescription: setNewTaskDescription,
    createTask: handleCreateTask,
  } = useTaskCreation({
    onTaskCreated: () => void refreshStats(),
  })

  // File upload hook
  const {
    isUploading: uploading,
    progress: uploadProgress,
    feedback: uploadFeedback,
    fileInputRef,
    openFilePicker,
    handleUpload: handleUploadFromDashboard,
  } = useFileUpload({
    onUploadComplete: () => void refreshStats(),
  })

  // Generate overview cards data
  const overviewCards = generateOverviewCards(stats, loadingStats)

  // Quick actions configuration
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

  // Determine which feedback to show (prioritize task feedback over upload feedback)
  const activeFeedback = taskFeedback || uploadFeedback

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleUploadFromDashboard}
      />

      {/* Feedback alerts */}
      <FeedbackAlert feedback={activeFeedback} />

      {/* Stats error alert */}
      {statsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {statsError}
        </Alert>
      )}

      {/* Welcome banner with quick actions */}
      <WelcomeBanner
        uploading={uploading}
        uploadProgress={uploadProgress}
        creatingTask={creatingTask}
        onCreateTask={openCreateTaskDialog}
        onUploadFile={openFilePicker}
      />

      {/* Stats overview cards */}
      <StatsOverview cards={overviewCards} />

      {/* Quick actions grid */}
      <QuickActions actions={quickActions} />

      {/* Productivity summary */}
      <ProductivitySummary
        completedTasks={stats.completedTasks}
        totalTasks={stats.totalTasks}
        filesCount={stats.filesCount}
        completionRate={stats.completionRate}
      />

      {/* Create task dialog */}
      <CreateTaskDialog
        open={createTaskOpen}
        title={newTaskTitle}
        description={newTaskDescription}
        isCreating={creatingTask}
        onClose={closeCreateTaskDialog}
        onTitleChange={setNewTaskTitle}
        onDescriptionChange={setNewTaskDescription}
        onSubmit={handleCreateTask}
      />
    </Container>
  )
}
