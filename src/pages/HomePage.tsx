import { Box, Container, Typography, Paper, Button, Card, CardContent } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  UploadFile as UploadIcon,
  Task as TaskIcon,
  CloudUpload as CloudUploadIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material'

export default function HomePage() {
  const navigate = useNavigate()

  const quickActions = [
    {
      title: 'رفع الملفات',
      description: 'ارفع ملفات ومجلدات إلى السحابة',
      icon: <CloudUploadIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/upload'),
      color: 'primary.main',
    },
    {
      title: 'إدارة المهام',
      description: 'عرض وإدارة المهام والمشاريع',
      icon: <TaskIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/tasks'),
      color: 'success.main',
    },
    {
      title: 'استعراض الملفات',
      description: 'تصفح الملفات المرفوعة مسبقاً',
      icon: <FolderIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/upload'),
      color: 'info.main',
    },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
          مرحباً بك في larthaa Agency
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.8, mb: 4 }}>
          منصة إدارة الملفات والمهام المتكاملة
        </Typography>
        <Paper
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(46, 125, 50, 0.1))',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 3,
          }}
        >
          <Typography variant="body1" sx={{ mb: 3 }}>
            ابدأ باستخدام منصتنا لإدارة الملفات والمهام بكفاءة وسهولة
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<UploadIcon />}
              onClick={() => navigate('/upload')}
              sx={{ borderRadius: 999, px: 4 }}
            >
              ابدأ رفع الملفات
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<TaskIcon />}
              onClick={() => navigate('/tasks')}
              sx={{ borderRadius: 999, px: 4 }}
            >
              عرض المهام
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          إجراءات سريعة
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 3
        }}>
          {quickActions.map((action, index) => (
            <Card
              key={index}
              sx={{
                height: '100%',
                border: '1px solid rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                },
              }}
              onClick={action.action}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ color: action.color, mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {action.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Features Section */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          الميزات الرئيسية
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3
        }}>
          <Paper
            sx={{
              p: 3,
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              📁 إدارة الملفات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
              رفع الملفات والمجلدات بسهولة، معاينة الملفات المدعومة، نسخ الروابط، وتنزيل الملفات.
              دعم كامل للصور والفيديوهات والملفات الأخرى.
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 3,
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              📋 إدارة المهام
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
              إنشاء وتتبع المهام، تنظيم المشاريع، تحديث الحالات، وإدارة سير العمل
              بفعالية وكفاءة.
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}
