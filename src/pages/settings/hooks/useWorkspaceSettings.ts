import { useState, useEffect, useCallback } from 'react'
import { fetchWorkspace, updateWorkspace } from '../../../api/workspaceApi'
import { uploadLogoFile } from '../utils/settingsUtils'

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
  saveWorkspace: (workspaceId: string) => Promise<void>
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
        setError('فشل تحميل بيانات مساحة العمل')
        console.error('Failed to load workspace:', err)
      } finally {
        setLoading(false)
      }
    },
    [isAdmin]
  )

  const saveWorkspace = useCallback(
    async (id: string) => {
      if (!isAdmin) return

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
        setOriginalData({
          name: workspaceName.trim(),
          industry: industry.trim(),
          logo: finalLogoUrl,
        })
        setLogoFile(null)
      } catch (err) {
        setError('فشل حفظ إعدادات مساحة العمل')
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
