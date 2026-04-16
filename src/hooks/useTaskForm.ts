import { useState, useCallback } from 'react'
import type { Task, TaskStatus, TaskPriority } from '../api/tasksApi'
import { DEFAULT_TASK_STATUS, DEFAULT_TASK_PRIORITY } from '../constants/tasks'

export interface ChecklistItemInput {
  text: string
  completed?: boolean
}

export interface LinkInput {
  url: string
  title?: string
}

export interface TaskFormState {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  selectedAssignees: string[]
  checklistItems: ChecklistItemInput[]
  links: LinkInput[]
  newChecklistItem: string
  newLink: { url: string; title: string }
}

export interface TaskFormActions {
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStatusChange: (value: TaskStatus) => void
  onPriorityChange: (value: TaskPriority) => void
  onDueDateChange: (value: string) => void
  onAssigneesChange: (value: string[]) => void
  onChecklistItemsChange: (value: ChecklistItemInput[]) => void
  onNewChecklistItemChange: (value: string) => void
  onNewLinkChange: (value: { url: string; title: string }) => void
  onAddChecklistItem: () => void
  onRemoveChecklistItem: (index: number) => void
  onAddLink: () => void
  onRemoveLink: (index: number) => void
  resetForm: () => void
  populateFromTask: (task: Task) => void
}

export function useTaskForm(): TaskFormState & TaskFormActions {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_TASK_STATUS)
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY)
  const [dueDate, setDueDate] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItemInput[]>([])
  const [links, setLinks] = useState<LinkInput[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newLink, setNewLink] = useState({ url: '', title: '' })

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setStatus(DEFAULT_TASK_STATUS)
    setPriority(DEFAULT_TASK_PRIORITY)
    setDueDate('')
    setSelectedAssignees([])
    setChecklistItems([])
    setLinks([])
    setNewChecklistItem('')
    setNewLink({ url: '', title: '' })
  }, [])

  const populateFromTask = useCallback((task: Task) => {
    setTitle(task.title)
    setDescription(task.description || '')
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.dueDate || '')
    setSelectedAssignees(task.assignees?.map(a => a.userId) || [])
    setChecklistItems(task.checklists?.map(c => ({ text: c.text, completed: c.completed })) || [])
    setLinks(task.links?.map(l => ({ url: l.url, title: l.title || '' })) || [])
    setNewChecklistItem('')
    setNewLink({ url: '', title: '' })
  }, [])

  const addChecklistItem = useCallback(() => {
    if (newChecklistItem.trim()) {
      setChecklistItems(prev => [...prev, { text: newChecklistItem.trim(), completed: false }])
      setNewChecklistItem('')
    }
  }, [newChecklistItem])

  const removeChecklistItem = useCallback((index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addLink = useCallback(() => {
    if (newLink.url.trim()) {
      setLinks(prev => [...prev, { url: newLink.url.trim(), title: newLink.title.trim() }])
      setNewLink({ url: '', title: '' })
    }
  }, [newLink])

  const removeLink = useCallback((index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }, [])

  return {
    // State
    title,
    description,
    status,
    priority,
    dueDate,
    selectedAssignees,
    checklistItems,
    links,
    newChecklistItem,
    newLink,
    // Actions
    onTitleChange: setTitle,
    onDescriptionChange: setDescription,
    onStatusChange: setStatus,
    onPriorityChange: setPriority,
    onDueDateChange: setDueDate,
    onAssigneesChange: setSelectedAssignees,
    onChecklistItemsChange: setChecklistItems,
    onNewChecklistItemChange: setNewChecklistItem,
    onNewLinkChange: setNewLink,
    onAddChecklistItem: addChecklistItem,
    onRemoveChecklistItem: removeChecklistItem,
    onAddLink: addLink,
    onRemoveLink: removeLink,
    resetForm,
    populateFromTask,
  }
}
