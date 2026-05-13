import { Container, Typography, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useSettingsForm, useWorkspaceSettings, usePasswordReset } from './settings/hooks'
import {
  GeneralSettingsSection,
  UploadSettingsSection,
  AccountSettingsSection,
  StorageInfoSection,
  WorkspaceSettingsSection,
  SaveButton,
  SettingsAlerts,
} from './settings/components'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser, refreshMe } = useAuth()

  const { isSubscribed, subscribe, unsubscribe, isSupported } = usePushNotifications()

  // Custom hooks for managing different settings sections
  const {
    darkMode,
    setDarkMode,
    autoUpload,
    setAutoUpload,
    language,
    setLanguage,
    maxFileSize,
    setMaxFileSize,
    successMessage,
    showSuccess,
  } = useSettingsForm()

  const {
    workspaceName,
    setWorkspaceName,
    industry,
    setIndustry,
    logoPreview,
    setLogoPreview,
    setLogoFile,
    loading: workspaceLoading,
    error: workspaceError,
    saveWorkspace,
  } = useWorkspaceSettings(user?.isAdmin ?? false, user?.workspaceId)

  const {
    loading: passwordResetLoading,
    message: passwordResetMessage,
    error: passwordResetError,
    requestReset,
  } = usePasswordReset()

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe()
      if (success) {
        showSuccess('تم إلغاء الاشتراك في الإشعارات بنجاح')
      }
    } else {
      const success = await subscribe()
      if (success) {
        showSuccess('تم الاشتراك في الإشعارات بنجاح')
      }
    }
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return

    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSettings = async () => {
    try {
      // Save workspace settings if admin
      if (user?.isAdmin && user.workspaceId) {
        const saved = await saveWorkspace(user.workspaceId)
        const withCacheBust = saved.logo
          ? `${saved.logo}${saved.logo.includes('?') ? '&' : '?'}v=${Date.now()}`
          : ''
        updateUser({
          workspaceName: saved.name,
          workspaceLogo: withCacheBust,
        })
        await refreshMe()
      }

      showSuccess('تم حفظ الإعدادات بنجاح', 1500)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleNavigateToProfile = () => {
    navigate('/dashboard/profile')
  }

  const handlePasswordReset = () => {
    if (user?.email) {
      requestReset(user.email)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
        الإعدادات
      </Typography>

      <SettingsAlerts
        successMessage={successMessage}
        passwordResetMessage={passwordResetMessage}
        passwordResetError={passwordResetError}
      />

      <GeneralSettingsSection
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        pushEnabled={isSubscribed}
        onPushToggle={handlePushToggle}
        pushSupported={isSupported}
        autoUpload={autoUpload}
        onAutoUploadChange={setAutoUpload}
      />

      <UploadSettingsSection
        language={language}
        onLanguageChange={setLanguage}
        maxFileSize={maxFileSize}
        onMaxFileSizeChange={setMaxFileSize}
      />

      <AccountSettingsSection
        user={user}
        onNavigateToProfile={handleNavigateToProfile}
        onPasswordReset={handlePasswordReset}
        passwordResetLoading={passwordResetLoading}
      />

      <StorageInfoSection />

      {user?.isAdmin && workspaceError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {workspaceError}
        </Alert>
      )}

      {user?.isAdmin && (
        <WorkspaceSettingsSection
          workspaceName={workspaceName}
          onWorkspaceNameChange={setWorkspaceName}
          industry={industry}
          onIndustryChange={setIndustry}
          logoPreview={logoPreview}
          onLogoChange={handleLogoChange}
          loading={workspaceLoading}
        />
      )}

      <SaveButton onSave={handleSaveSettings} loading={workspaceLoading} />
    </Container>
  )
}
