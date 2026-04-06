import { Box, Skeleton, Paper, Card, CardContent } from '@mui/material'

// Task Skeleton for kanban columns
export function TaskCardSkeleton() {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'background.paper',
        mb: 2,
      }}
    >
      <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="rounded" width={50} height={20} />
        <Skeleton variant="text" width={40} height={16} sx={{ ml: 'auto' }} />
      </Box>
    </Paper>
  )
}

// Column Skeleton for kanban boards
export function ColumnSkeleton() {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        flex: '1 1 280px',
        minHeight: 220,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'background.paper',
      }}
    >
      <Skeleton variant="text" width={100} height={28} sx={{ mb: 2 }} />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </Paper>
  )
}

// Chat conversation item skeleton
export function ConversationItemSkeleton() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 1.5 }}>
      <Skeleton variant="circular" width={28} height={28} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={18} />
        <Skeleton variant="text" width="40%" height={14} />
      </Box>
    </Box>
  )
}

// Chat message skeleton
export function MessageSkeleton({ isMine = false }: { isMine?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: isMine ? 'flex-start' : 'flex-end', mb: 1.5 }}>
      <Paper
        sx={{
          maxWidth: '78%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isMine ? 'primary.main' : 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Skeleton variant="circular" width={22} height={22} />
          <Skeleton variant="text" width={60} height={14} />
        </Box>
        <Skeleton variant="text" width="90%" height={16} />
        <Skeleton variant="text" width="70%" height={16} />
        <Skeleton variant="text" width={80} height={12} sx={{ mt: 0.5 }} />
      </Paper>
    </Box>
  )
}

// File item skeleton for list view
export function FileItemSkeleton() {
  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 1 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="30%" height={14} />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
    </Box>
  )
}

// File item skeleton for grid view
export function FileItemGridSkeleton() {
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
        <Skeleton variant="rounded" width={64} height={64} />
      </Box>
      <CardContent sx={{ p: 2, pt: 0, flex: 1 }}>
        <Skeleton variant="text" width="80%" height={20} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width="40%" height={14} sx={{ mx: 'auto', mt: 1 }} />
      </CardContent>
      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
    </Card>
  )
}

// Folder item skeleton
export function FolderItemSkeleton() {
  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        mb: 1,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 1 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="text" width="60%" height={14} />
      </Box>
      <Skeleton variant="circular" width={32} height={32} />
    </Box>
  )
}

// Folder item skeleton for grid view
export function FolderItemGridSkeleton() {
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
        <Skeleton variant="rounded" width={64} height={64} sx={{ borderRadius: 1 }} />
      </Box>
      <CardContent sx={{ p: 2, pt: 0, flex: 1 }}>
        <Skeleton variant="text" width="60%" height={20} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width="40%" height={14} sx={{ mx: 'auto', mt: 1 }} />
      </CardContent>
      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
    </Card>
  )
}

// Activity item skeleton
export function ActivityItemSkeleton() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton variant="rounded" width={50} height={20} />
        </Box>
        <Skeleton variant="text" width="70%" height={16} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={80} height={12} />
      </Box>
    </Box>
  )
}

// Team member card skeleton
export function TeamMemberSkeleton() {
  return (
    <Card sx={{ mb: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box>
              <Skeleton variant="text" width={120} height={24} />
              <Skeleton variant="text" width={150} height={16} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="text" width={80} height={14} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// Page loading skeleton with header
export function PageHeaderSkeleton() {
  return (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton variant="text" width={150} height={40} />
      <Skeleton variant="rounded" width={100} height={36} />
    </Box>
  )
}

// Generic list skeleton
export function ListSkeleton({ count = 5, itemHeight = 60 }: { count?: number; itemHeight?: number }) {
  return (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={itemHeight}
          sx={{ mb: 1, borderRadius: 2 }}
        />
      ))}
    </Box>
  )
}

// Profile page skeleton
export function ProfileSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={200} height={16} />
        <Skeleton variant="text" width={150} height={12} sx={{ mt: 0.5 }} />
      </Box>
      <Skeleton variant="rounded" height={56} sx={{ mb: 3, borderRadius: 1 }} />
      <Skeleton variant="rounded" height={56} sx={{ mb: 3, borderRadius: 1 }} />
    </Box>
  )
}
