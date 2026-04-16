import { Box, Button, LinearProgress, Paper, Typography } from '@mui/material'
import { CloudUpload, AddSquare } from '@solar-icons/react'

interface WelcomeBannerProps {
  uploading: boolean
  uploadProgress: number
  creatingTask: boolean
  onCreateTask: () => void
  onUploadFile: () => void
}

export const WelcomeBanner = ({
  uploading,
  uploadProgress,
  creatingTask,
  onCreateTask,
  onUploadFile,
}: WelcomeBannerProps) => {
  return (
    <Paper
      sx={{
        p: { xs: 3, md: 4 },
        mb: 4,
        borderRadius: 4,
        border: '1px solid rgba(25, 118, 210, 0.12)',
        background:
          'radial-gradient(circle at 15% 10%, rgba(25,118,210,0.2), transparent 45%), radial-gradient(circle at 85% 0%, rgba(46,125,50,0.2), transparent 40%), rgba(255,255,255,0.02)',
        backdropFilter: 'blur(6px)',
        boxShadow: 'none',
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        نظرة سريعة على بياناتك اليومية
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.82, maxWidth: 780, mb: 3 }}>
        هذه الصفحة تمنحك ملخصاً سريعاً عن حالة المهام والملفات، مع اختصارات مباشرة لتنفيذ أهم
        الإجراءات بدون التنقل بين الصفحات.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddSquare />}
          onClick={onCreateTask}
          sx={{ borderRadius: 999, px: 3.5, gap: 1 }}
          disabled={creatingTask}
        >
          مهمة جديدة
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<CloudUpload />}
          onClick={onUploadFile}
          sx={{ borderRadius: 999, px: 3.5, gap: 1 }}
          disabled={uploading}
        >
          رفع ملف
        </Button>
      </Box>

      {uploading && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            جاري رفع الملفات... {uploadProgress}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ mt: 0.8, height: 6, borderRadius: 999 }}
          />
        </Box>
      )}
    </Paper>
  )
}
