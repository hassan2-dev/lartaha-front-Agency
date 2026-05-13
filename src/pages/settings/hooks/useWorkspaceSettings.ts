import { useState, useEffect, useCallback } from 'react'
import { fetchWorkspace, updateWorkspace } from '../../../api/workspaceApi'
import { uploadLogoFile } from '../utils/settingsUtils'

function messageFromApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: string; error?: string } }
    message?: string
  }
  const d = e.response?.data
  const fromBody =
    (typeof d?.message === 'string' && d.message.trim()) ||
    (typeof d?.error === 'string' && d.error.trim()) ||
    ''
  if (fromBody) return fromBody
  if (typeof e.message === 'string' && e.message.trim()) return e.message.trim()
  return fallback
}

export interface WorkspaceSettings {
  name: string
  industry: string
  logo: string
}

export interface UseWorkspaceSettingsReturn {
  workspaceName: string
  setWorkspaceName: (name: string) => void
  industry: string
  setIndustry: (industry: string) => void
  logoPreview: string
  setLogoPreview: (logo: string) => void
  logoFile: File | null
  setLogoFile: (file: File | null) => void
  loading: boolean
  error: string | null
  loadWorkspace: (workspaceId: string) => Promise<void>
  saveWorkspace: (workspaceId: string) => Promise<WorkspaceSettings>
  hasChanges: boolean
}

export const useWorkspaceSettings = (
  isAdmin: boolean,
  workspaceId?: string
): UseWorkspaceSettingsReturn => {
  const [workspaceName, setWorkspaceName] = useState('')
  const [industry, setIndustry] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [originalData, setOriginalData] = useState<WorkspaceSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspace = useCallback(
    async (id: string) => {
      if (!isAdmin) return

      try {
        setLoading(true)
        setError(null)
        const data = await fetchWorkspace(id)

        const settings: WorkspaceSettings = {
          name: data.name || '',
          industry: data.industry || '',
          logo: data.logo || '',
        }

        setWorkspaceName(settings.name)
        setIndustry(settings.industry)
        setLogoPreview(settings.logo)
        setOriginalData(settings)
      } catch (err) {
        setError(
          messageFromApiError(err, 'فشل تحميل بيانات مساحة العمل')
        )
        console.error('Failed to load workspace:', err)
      } finally {
        setLoading(false)
      }
    },
    [isAdmin]
  )

  const saveWorkspace = useCallback(
    async (id: string) => {
      if (!isAdmin) {
        throw new Error('Not authorized to update workspace')
      }

      try {
        setLoading(true)
        setError(null)

        let finalLogoUrl = logoPreview

        // Upload logo if new one selected
        if (logoFile) {
          finalLogoUrl = await uploadLogoFile(logoFile)
        }

        await updateWorkspace(id, {
          name: workspaceName.trim(),
          industry: industry.trim(),
          logo: finalLogoUrl,
        })

        // Update original data after successful save
        const savedSettings: WorkspaceSettings = {
          name: workspaceName.trim(),
          industry: industry.trim(),
          logo: finalLogoUrl,
        }
        setOriginalData(savedSettings)
        setLogoFile(null)
        return savedSettings
      } catch (err) {
        setError(messageFromApiError(err, 'فشل حفظ إعدادات مساحة العمل'))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, workspaceName, industry, logoPreview, logoFile]
  )

  // Calculate if there are unsaved changes
  const hasChanges =
    originalData !== null &&
    (workspaceName.trim() !== originalData.name ||
      industry.trim() !== originalData.industry ||
      logoPreview !== originalData.logo ||
      logoFile !== null)

  // Load workspace on mount when user is admin
  useEffect(() => {
    if (isAdmin && workspaceId) {
      loadWorkspace(workspaceId)
    }
  }, [isAdmin, workspaceId, loadWorkspace])

  return {
    workspaceName,
    setWorkspaceName,
    industry,
    setIndustry,
    logoPreview,
    setLogoPreview,
    logoFile,
    setLogoFile,
    loading,
    error,
    loadWorkspace,
    saveWorkspace,
    hasChanges,
  }
}
