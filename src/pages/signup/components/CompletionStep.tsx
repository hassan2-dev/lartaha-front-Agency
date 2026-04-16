import { Box, Typography, Button, Avatar, alpha, useTheme } from '@mui/material'
import { CheckCircle, ArrowForward } from '@mui/icons-material'
import type { CompletionStepProps } from '../types'

export const CompletionStep = ({ onFinish }: CompletionStepProps) => {
  const theme = useTheme()

  const nextSteps = [
    'إنشاء فرق العمل المختلفة',
    'دعوة أعضاء الفريق عبر البريد الإلكتروني',
    'إدارة المهام والملفات المشتركة',
    'متابعة أنشطة الفريق والتقدم',
  ]

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Avatar
        sx={{
          width: 80,
          height: 80,
          bgcolor: alpha(theme.palette.success.main, 0.1),
          color: theme.palette.success.main,
          mx: 'auto',
          mb: 3,
        }}
      >
        <CheckCircle sx={{ fontSize: 40 }} />
      </Avatar>

      <Typography variant="h4" gutterBottom fontWeight="bold">
        مساحة العمل جاهزة! 🎉
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
        تم إعداد مساحة العمل بنجاح. يمكنك الآن دعوة أعضاء الفريق والبدء في التعاون.
      </Typography>

      <Typography variant="h6" sx={{ mb: 3 }}>
        الخطوات التالية:
      </Typography>

      <Box component="ol" sx={{ textAlign: 'right', pr: 2, mb: 4 }}>
        {nextSteps.map((step, index) => (
          <Typography component="li" sx={{ mb: 1 }} key={index}>
            {step}
          </Typography>
        ))}
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={onFinish}
        endIcon={<ArrowForward sx={{ mr: 1 }} />}
        sx={{ mb: 2, px: 4, py: 1.5 }}
      >
        الانتقال إلى لوحة التحكم
      </Button>

      <Typography variant="body2" color="text.secondary">
        يمكنك دعوة أعضاء الفريق لاحقاً من صفحة الفرق
      </Typography>
    </Box>
  )
}
