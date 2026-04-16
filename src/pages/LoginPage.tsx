import { Box, Card, CardContent, Container, Fade } from '@mui/material'
import { useLoginForm } from '../hooks/useLoginForm'
import {
  LoginHeader,
  LoginAlerts,
  LoginForm,
  ForgotPasswordButton,
  LoginFooter,
} from '../components/login'

export default function LoginPage() {
  const {
    email,
    password,
    showPassword,
    isLoading,
    displayedError,
    forgotLoading,
    forgotMessage,
    forgotError,
    setEmail,
    setPassword,
    toggleShowPassword,
    handleSubmit,
    handleForgotPassword,
  } = useLoginForm()

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Fade in timeout={600}>
        <Card
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 2,
            boxShadow: t => `0 8px 24px ${t.palette.primary.main}15`,
            overflow: 'hidden',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <LoginHeader title="تسجيل دخول" subtitle="ارفع الي يعجبك ومعليك" />

          <CardContent sx={{ p: 4 }}>
            <Fade in timeout={800}>
              <Box>
                <LoginAlerts
                  error={displayedError}
                  forgotMessage={forgotMessage}
                  forgotError={forgotError}
                />

                <LoginForm
                  email={email}
                  password={password}
                  showPassword={showPassword}
                  isLoading={isLoading}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onTogglePasswordVisibility={toggleShowPassword}
                  onSubmit={handleSubmit}
                />

                <ForgotPasswordButton isLoading={forgotLoading} onClick={handleForgotPassword} />

                <LoginFooter />
              </Box>
            </Fade>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  )
}
