import { Box, Container, Paper, CardContent, Alert, Fade, useTheme, alpha } from '@mui/material'
import { useSignUp } from './hooks'
import { SignUpHeader, SignUpStepper, StepContent } from './components'

const STEPS = ['إنشاء حساب المدير', 'إعداد مساحة العمل', 'دعوة أعضاء الفريق']

export default function SignUpPage() {
  const theme = useTheme()
  const {
    activeStep,
    loading,
    error,
    showPassword,
    showConfirmPassword,
    adminData,
    workspaceData,
    updateAdminData,
    updateWorkspaceData,
    handleLogoUpload,
    handleLogoRemove,
    handleAdminSubmit,
    handleWorkspaceSubmit,
    handleFinish,
    togglePassword,
    toggleConfirmPassword,
    prevStep,
  } = useSignUp()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Fade in timeout={600}>
          <Paper
            elevation={2}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <SignUpHeader />

            <CardContent sx={{ p: 6 }}>
              <Fade in timeout={800}>
                <Box>
                  {error && (
                    <Alert
                      severity="error"
                      sx={{
                        mb: 4,
                        borderRadius: 2,
                        animation: 'shake 0.5s ease-in-out',
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  <SignUpStepper activeStep={activeStep} steps={STEPS} />

                  <StepContent
                    activeStep={activeStep}
                    adminData={adminData}
                    workspaceData={workspaceData}
                    loading={loading}
                    error={error}
                    showPassword={showPassword}
                    showConfirmPassword={showConfirmPassword}
                    onAdminChange={updateAdminData}
                    onWorkspaceChange={updateWorkspaceData}
                    onLogoUpload={handleLogoUpload}
                    onLogoRemove={handleLogoRemove}
                    onTogglePassword={togglePassword}
                    onToggleConfirmPassword={toggleConfirmPassword}
                    onAdminSubmit={handleAdminSubmit}
                    onWorkspaceSubmit={handleWorkspaceSubmit}
                    onBackToLogin={() => (window.location.href = '/login')}
                    onBackToAdmin={prevStep}
                    onFinish={handleFinish}
                  />
                </Box>
              </Fade>
            </CardContent>
          </Paper>
        </Fade>
      </Container>
    </Box>
  )
}
