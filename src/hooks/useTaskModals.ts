import { useState, useCallback } from 'react'
import type { Task } from '../api/tasksApi'

export interface UseTaskModalsReturn {
  // Create modal state
  isCreateOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void

  // Edit modal state
  isEditOpen: boolean
  selectedTask: Task | null
  openEditModal: (task: Task) => void
  closeEditModal: () => void
}

export function useTaskModals(onResetForm: () => void): UseTaskModalsReturn {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const openCreateModal = useCallback(() => {
    setSelectedTask(null)
    onResetForm()
    setIsCreateOpen(true)
  }, [onResetForm])

  const closeCreateModal = useCallback(() => {
    setIsCreateOpen(false)
    setSelectedTask(null)
    onResetForm()
  }, [onResetForm])

  const openEditModal = useCallback((task: Task) => {
    setSelectedTask(task)
    setIsEditOpen(true)
  }, [])

  const closeEditModal = useCallback(() => {
    setIsEditOpen(false)
    setSelectedTask(null)
    onResetForm()
  }, [onResetForm])

  return {
    isCreateOpen,
    openCreateModal,
    closeCreateModal,
    isEditOpen,
    selectedTask,
    openEditModal,
    closeEditModal,
  }
}
