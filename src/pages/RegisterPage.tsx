import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Container,
} from '@mui/material'
import { api } from '../api/http'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    position: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<any>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      return
    }

    // We could validate the token here, but for simplicity we'll just show the form
    // The server will validate the token during registration
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError('Invalid invitation link')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/register', {
        token,
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim(),
        position: formData.position.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      })

      // Store the token
      localStorage.setItem('token', response.data.token)
      
      // Redirect to dashboard
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  if (!token) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Invalid invitation link. Please check your email and try again.
          </Alert>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Join Team
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              You've been invited to join a team! Create your account to get started.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange('name')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange('username')}
              />
              <TextField
                margin="normal"
                fullWidth
                id="position"
                label="Position (optional)"
                name="position"
                autoComplete="organization-title"
                value={formData.position}
                onChange={handleChange('position')}
              />
              <TextField
                margin="normal"
                fullWidth
                id="phone"
                label="Phone Number (optional)"
                name="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange('password')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
