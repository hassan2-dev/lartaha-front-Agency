import { Box, LinearProgress, Paper, Typography } from '@mui/material'
import { FolderOpen } from '@solar-icons/react'

interface ProductivitySummaryProps {
  completedTasks: number
  totalTasks: number
  filesCount: number
  completionRate: number
}

export const ProductivitySummary = ({
  completedTasks,
  totalTasks,
  filesCount,
  completionRate,
}: ProductivitySummaryProps) => {
  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 2,
        border: '1px solid rgba(25, 118, 210, 0.12)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        boxShadow: 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ color: 'info.main', display: 'flex' }}>
          <FolderOpen size={24} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          لمحة إنتاجية اليوم
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
        تم إنجاز {completedTasks} من أصل {totalTasks} مهمة، وعدد الملفات المتاحة حالياً {filesCount}
        . استمر بهذا المعدل للوصول لهدف الأسبوع.
      </Typography>
      <LinearProgress
        variant="determinate"
        value={completionRate}
        sx={{ height: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}
      />
    </Paper>
  )
}
