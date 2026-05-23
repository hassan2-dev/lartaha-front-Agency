import { useState, useEffect, useCallback } from 'react'
import { Mail, Group, Person, DeleteOutline } from '@mui/icons-material'
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
  IconButton,
  Tooltip,
  Container,
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { PasswordInput } from '../components/login/PasswordInput'
import {
  fetchWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  type WorkspaceMember,
} from '../api/workspaceApi'
import { TeamMemberSkeleton } from '../components/SkeletonLoaders'

export default function TeamsPage() {
  const { user: currentUser } = useAuth()
  const [teams, setTeams] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null)
  const [removePassword, setRemovePassword] = useState('')
  const [showRemovePassword, setShowRemovePassword] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const members = await fetchWorkspaceMembers()
      setTeams(members)
    } catch {
      setError('فشل في جلب أعضاء مساحة العمل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return

    setLoading(true)
    setError(null)
    try {
      await inviteWorkspaceMember(inviteEmail)
      setShowInviteModal(false)
      setInviteEmail('')
      await fetchTeams()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || 'فشل في إرسال الدعوة')
    } finally {
      setLoading(false)
    }
  }

  const openRemoveDialog = (member: WorkspaceMember) => {
    setMemberToRemove(member)
    setRemovePassword('')
    setRemoveError(null)
    setShowRemovePassword(false)
  }

  const closeRemoveDialog = () => {
    if (removing) return
    setMemberToRemove(null)
    setRemovePassword('')
    setRemoveError(null)
  }

  const confirmRemoveMember = async () => {
    if (!memberToRemove || !removePassword.trim()) return

    setRemoving(true)
    setRemoveError(null)
    try {
      await removeWorkspaceMember(memberToRemove.id, removePassword)
      closeRemoveDialog()
      await fetchTeams()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } }
      const status = e.response?.status
      if (status === 401 || status === 403) {
        setRemoveError(e.response?.data?.message || 'كلمة المرور غير صحيحة')
      } else if (status === 404) {
        setRemoveError('العضو غير موجود أو تمت إزالته مسبقاً')
      } else {
        setRemoveError(e.response?.data?.message || 'فشل في إزالة العضو')
      }
    } finally {
      setRemoving(false)
    }
  }

  const canRemoveMember = (member: WorkspaceMember) => {
    const memberUserId = member.userId ?? member.user?.id
    if (memberUserId && currentUser?.id && memberUserId === currentUser.id) return false
    if (member.role === 'admin') return false
    return true
  }

  const memberDisplayName = (member: WorkspaceMember) =>
    member.user?.name || member.user?.email || member.email || 'عضو'

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontSize: { xs: '1.35rem', sm: '2.125rem' } }}>
          أعضاء مساحة العمل
        </Typography>
        <Button
          variant="contained"
          startIcon={<Mail />}
          onClick={() => setShowInviteModal(true)}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, whiteSpace: 'nowrap' }}
        >
          دعوة عضو
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box>
        <Typography variant="h6" mb={2}>
          جميع الأعضاء
        </Typography>
        {loading && teams.length === 0 ? (
          <>
            <TeamMemberSkeleton />
            <TeamMemberSkeleton />
            <TeamMemberSkeleton />
            <TeamMemberSkeleton />
          </>
        ) : teams.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={6}
            color="text.secondary"
          >
            <Group sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography>لا يوجد أعضاء بعد. قم بدعوة أول عضو في فريقك!</Typography>
          </Box>
        ) : (
          teams.map(member => (
            <Card
              key={member.id}
              sx={{
                mb: 2,
                border: '1px solid rgb(226, 232, 240)',
                '&:hover': {
                  border: '1px solid rgb(203, 213, 225)',
                },
              }}
            >
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: { xs: 1.5, sm: 2 },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      minWidth: 0,
                      width: { xs: '100%', sm: 'auto' },
                    }}
                  >
                    <Avatar
                      src={member.user?.avatar}
                      alt={memberDisplayName(member)}
                      sx={{ flexShrink: 0 }}
                    >
                      {member.user?.avatar ? null : <Person />}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="h6" noWrap>
                        {memberDisplayName(member)}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" noWrap>
                        {member.user?.email || member.email || 'مدعو'}
                      </Typography>
                      {member.user?.position && (
                        <Typography color="text.secondary" variant="body2" noWrap>
                          {member.user.position}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    }}
                  >
                    <Chip
                      label={member.role || 'member'}
                      size="small"
                      color={member.role === 'admin' ? 'primary' : 'default'}
                    />
                    <Typography color="text.secondary" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                      انضم {new Date(member.joinedAt).toLocaleDateString()}
                    </Typography>
                    {canRemoveMember(member) && (
                      <Tooltip title="إزالة العضو">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => openRemoveDialog(member)}
                          aria-label={`إزالة ${memberDisplayName(member)}`}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      <Dialog
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>دعوة عضو الفريق</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="البريد الإلكتروني"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteModal(false)}>إلغاء</Button>
          <Button
            onClick={() => void inviteMember()}
            variant="contained"
            color="success"
            disabled={loading || !inviteEmail.trim()}
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الدعوة'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!memberToRemove} onClose={closeRemoveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>إزالة عضو من مساحة العمل</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            أنت على وشك إزالة{' '}
            <strong>{memberToRemove ? memberDisplayName(memberToRemove) : ''}</strong> من الفريق.
            أدخل كلمة مرور حسابك (المدير) للتأكيد.
          </Typography>
          {removeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {removeError}
            </Alert>
          )}
          <PasswordInput
            value={removePassword}
            onChange={setRemovePassword}
            showPassword={showRemovePassword}
            onToggleVisibility={() => setShowRemovePassword(v => !v)}
            label="كلمة مرور المدير"
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveDialog} disabled={removing}>
            إلغاء
          </Button>
          <Button
            onClick={() => void confirmRemoveMember()}
            variant="contained"
            color="error"
            disabled={removing || !removePassword.trim()}
          >
            {removing ? 'جاري الإزالة...' : 'تأكيد الإزالة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
