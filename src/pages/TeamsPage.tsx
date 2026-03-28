import { useState, useEffect } from 'react'
import {
  Mail,
  Group,
  Person,
} from '@mui/icons-material'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Alert,
} from '@mui/material'
import { api } from '../api/http'

interface WorkspaceMember {
  id: string
  workspaceId: string
  userId?: string
  email?: string
  role: string
  joinedAt: string
  invitedBy?: string
  user?: {
    id: string
    email: string
    username: string
    name: string
    position?: string
    avatar?: string
    createdAt: string
  }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await api.get('/api/workspace/members')
      setTeams(response.data.members || [])
    } catch (err) {
      setError('Failed to fetch workspace members')
    }
  }

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return

    setLoading(true)
    try {
      await api.post('/api/workspace/invite', {
        email: inviteEmail.trim(),
      })
      setShowInviteModal(false)
      setInviteEmail('')
      fetchTeams()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Workspace Members</Typography>
        <Button
          variant="contained"
          startIcon={<Mail />}
          onClick={() => setShowInviteModal(true)}
        >
          Invite Member
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box>
        <Typography variant="h6" mb={2}>All Members</Typography>
        {teams.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={6}
            color="text.secondary"
          >
            <Group sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography>No members yet. Invite your first team member!</Typography>
          </Box>
        ) : (
          teams.map(member => (
            <Card
              key={member.id}
              sx={{
                mb: 2,
                '&:hover': {
                  borderColor: 'grey.300',
                },
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar src={member.user?.avatar} alt={member.user?.name || member.email}>
                      {member.user?.avatar ? null : <Person />}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {member.user?.name || member.email}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {member.user?.email || 'Invited'}
                      </Typography>
                      {member.user?.position && (
                        <Typography color="text.secondary" variant="body2">
                          {member.user.position}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={member.role || 'member'}
                      size="small"
                      color={member.role === 'admin' ? 'primary' : 'default'}
                    />
                    <Typography color="text.secondary" variant="body2">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Invite Dialog */}
      <Dialog open={showInviteModal} onClose={() => setShowInviteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email address"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteModal(false)}>Cancel</Button>
          <Button
            onClick={inviteMember}
            variant="contained"
            color="success"
            disabled={loading || !inviteEmail.trim()}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
