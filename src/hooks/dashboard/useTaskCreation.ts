import { useState, useCallback } from 'react'
import { createTask, type Task } from '../../api/tasksApi'
import { extractErrorMessage } from '../../utils/dashboard/errorHandling'
import type { ActionFeedback, UseTaskCreationReturn } from '../../types/dashboard'

interface UseTaskCreationOptions {
  onTaskCreated?: (task: Task) => void
}

export const useTaskCreation = (options: UseTaskCreationOptions = {}): UseTaskCreationReturn => {
  const { onTaskCreated } = options
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)

  const openDialog = useCallback(() => {
    setFeedback(null)
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    if (isCreating) return
    setIsOpen(false)
    setTitle('')
    setDescription('')
  }, [isCreating])

  const handleCreateTask = useCallback(async (): Promise<Task | null> => {
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'يرجى إدخال عنوان المهمة' })
      return null
    }

    setIsCreating(true)
    setFeedback(null)

    try {
      const createdTask = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'todo',
        priority: 'medium',
      })

      onTaskCreated?.(createdTask)
      setIsOpen(false)
      setTitle('')
      setDescription('')
      setFeedback({ type: 'success', message: 'تم إنشاء المهمة بنجاح' })
      return createdTask
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'فشل إنشاء المهمة')
      setFeedback({ type: 'error', message })
      return null
    } finally {
      setIsCreating(false)
    }
  }, [title, description, onTaskCreated])

  return {
    isOpen,
    title,
    description,
    isCreating,
    feedback,
    openDialog,
    closeDialog,
    setTitle,
    setDescription,
    createTask: handleCreateTask,
  }
}
