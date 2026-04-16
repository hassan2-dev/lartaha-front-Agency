/**
 * usePrivacySettings Hook
 * Manages file privacy settings and team member access
 */

import { useState, useCallback, useEffect } from 'react'
import { API_ENV } from '../../../config/api'
import { api } from '../../../api/http'
import type { TeamMember, FilePrivacySettings } from '../types'

interface UsePrivacySettingsOptions {
  onError: (message: string) => void
  onSuccess: (message: string) => void
  filePrivacySettings: Record<string, FilePrivacySettings>
  setFilePrivacySettings: (settings: Record<string, FilePrivacySettings>) => void
}

export function usePrivacySettings(options: UsePrivacySettingsOptions) {
  const { onError, onSuccess, filePrivacySettings, setFilePrivacySettings } = options

  // Modal state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [selectedFileForPrivacy, setSelectedFileForPrivacy] = useState<{
    key: string
    filename: string
  } | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    setLoadingTeamMembers(true)
    try {
      const response = await api.get('/api/workspace/members')
      setTeamMembers(response.data.members || [])
    } catch (e: unknown) {
      const err = e as { message?: string }
      console.error('Failed to fetch team members:', err.message)
    } finally {
      setLoadingTeamMembers(false)
    }
  }, [])

  // Load team members on mount
  useEffect(() => {
    void fetchTeamMembers()
  }, [fetchTeamMembers])

  // Open privacy modal
  const openPrivacyModal = useCallback(
    (fileKey: string, filename: string) => {
      setSelectedFileForPrivacy({ key: fileKey, filename })
      const currentSettings = filePrivacySettings[fileKey]
      setSelectedMembers(currentSettings?.allowedMembers || [])
      setShowPrivacyModal(true)
    },
    [filePrivacySettings]
  )

  // Toggle member selection
  const toggleMemberSelection = useCallback((memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }, [])

  // Save privacy settings
  const savePrivacySettings = useCallback(async () => {
    if (!selectedFileForPrivacy) return false

    try {
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/files/privacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          fileKey: selectedFileForPrivacy.key,
          restricted: selectedMembers.length > 0,
          allowedMembers: selectedMembers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save privacy settings')
      }

      setFilePrivacySettings({
        ...filePrivacySettings,
        [selectedFileForPrivacy.key]: {
          restricted: selectedMembers.length > 0,
          allowedMembers: selectedMembers,
          canAccess: true,
        },
      })

      onSuccess('تم حفظ إعدادات الخصوصية')
      setShowPrivacyModal(false)
      setSelectedFileForPrivacy(null)
      setSelectedMembers([])
      return true
    } catch (e: unknown) {
      const err = e as { message?: string }
      onError(err.message || 'خطأ غير معروف')
      return false
    }
  }, [
    selectedFileForPrivacy,
    selectedMembers,
    filePrivacySettings,
    setFilePrivacySettings,
    onError,
    onSuccess,
  ])

  return {
    // State
    showPrivacyModal,
    setShowPrivacyModal,
    selectedFileForPrivacy,
    selectedMembers,
    teamMembers,
    loadingTeamMembers,

    // Actions
    openPrivacyModal,
    toggleMemberSelection,
    savePrivacySettings,
  }
}
