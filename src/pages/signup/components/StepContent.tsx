import { AdminStep } from './AdminStep'
import { WorkspaceStep } from './WorkspaceStep'
import { CompletionStep } from './CompletionStep'
import type { AdminData, WorkspaceData } from '../types'

interface StepContentProps {
  activeStep: number
  adminData: AdminData
  workspaceData: WorkspaceData
  loading: boolean
  error: string
  showPassword: boolean
  showConfirmPassword: boolean
  onAdminChange: (field: keyof AdminData, value: string) => void
  onWorkspaceChange: (field: keyof WorkspaceData, value: string) => void
  onLogoUpload: (file: File) => void
  onLogoRemove: () => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
  onAdminSubmit: () => void
  onWorkspaceSubmit: () => void
  onBackToLogin: () => void
  onBackToAdmin: () => void
  onFinish: () => void
}

export const StepContent = ({
  activeStep,
  adminData,
  workspaceData,
  loading,
  error,
  showPassword,
  showConfirmPassword,
  onAdminChange,
  onWorkspaceChange,
  onLogoUpload,
  onLogoRemove,
  onTogglePassword,
  onToggleConfirmPassword,
  onAdminSubmit,
  onWorkspaceSubmit,
  onBackToLogin,
  onBackToAdmin,
  onFinish,
}: StepContentProps) => {
  switch (activeStep) {
    case 0:
      return (
        <AdminStep
          adminData={adminData}
          loading={loading}
          error={error}
          showPassword={showPassword}
          showConfirmPassword={showConfirmPassword}
          onAdminChange={onAdminChange}
          onTogglePassword={onTogglePassword}
          onToggleConfirmPassword={onToggleConfirmPassword}
          onSubmit={onAdminSubmit}
          onBack={onBackToLogin}
        />
      )

    case 1:
      return (
        <WorkspaceStep
          workspaceData={workspaceData}
          loading={loading}
          error={error}
          onWorkspaceChange={onWorkspaceChange}
          onLogoUpload={onLogoUpload}
          onLogoRemove={onLogoRemove}
          onSubmit={onWorkspaceSubmit}
          onBack={onBackToAdmin}
        />
      )

    case 2:
      return <CompletionStep onFinish={onFinish} />

    default:
      return null
  }
}
