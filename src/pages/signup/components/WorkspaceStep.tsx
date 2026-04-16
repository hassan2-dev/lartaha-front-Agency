import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material'
import {
  Business,
  Workspaces,
  CloudUpload,
  Delete,
  ArrowForward,
  ArrowBack,
} from '@mui/icons-material'
import type { WorkspaceStepProps } from '../types'

export const WorkspaceStep = ({
  workspaceData,
  loading,
  onWorkspaceChange,
  onLogoUpload,
  onLogoRemove,
  onSubmit,
  onBack,
}: WorkspaceStepProps) => {
  const theme = useTheme()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onLogoUpload(file)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            mx: 'auto',
            mb: 2,
          }}
        >
          <Business sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography variant="h6" gutterBottom>
          أخبرنا عن مساحة عملك
        </Typography>
        <Typography color="text.secondary" variant="body2">
          قم بإعداد مساحة العمل الخاصة بك لبدء التعاون مع فريقك
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <TextField
            required
            fullWidth
            id="workspaceName"
            label="اسم مساحة العمل"
            name="workspaceName"
            value={workspaceData.name}
            onChange={e => onWorkspaceChange('name', e.target.value)}
            placeholder="مثال: شركة التقنية المتقدمة"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: <Workspaces sx={{ mr: 1, color: 'text.secondary' }} />,
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            id="industry"
            label="الصناعة"
            name="industry"
            value={workspaceData.industry}
            onChange={e => onWorkspaceChange('industry', e.target.value)}
            placeholder="مثال: التكنولوجيا، الرعاية الصحية، التعليم"
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              شعار مساحة العمل
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
              }}
            >
              {workspaceData.logo ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={workspaceData.logo}
                    sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                    variant="rounded"
                  />
                  <IconButton
                    onClick={onLogoRemove}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' },
                    }}
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ) : (
                <Box>
                  <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    اسحب وأفلت ملف الشعار هنا
                  </Typography>
                  <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
                    اختيار ملف
                    <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                  </Button>
                </Box>
              )}
              {!workspaceData.logo && (
                <Button variant="text" component="label" size="small" sx={{ mt: 1 }}>
                  <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                  أو اختر ملف
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              الصيغات المقبولة: JPG, PNG, GIF (الحد الأقصى: 5 ميجابايت)
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBack sx={{ ml: 1 }} />}>
          السابق
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          endIcon={<ArrowForward sx={{ mr: 1 }} />}
          sx={{ minWidth: 150 }}
        >
          {loading ? 'جارٍ الإنشاء...' : 'إنشاء مساحة العمل'}
        </Button>
      </Box>
    </Box>
  )
}
