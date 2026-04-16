import {
  Paper,
  Typography,
  Box,
  Avatar,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material'
import { Home, Camera } from '@solar-icons/react'

interface WorkspaceSettingsSectionProps {
  workspaceName: string
  onWorkspaceNameChange: (value: string) => void
  industry: string
  onIndustryChange: (value: string) => void
  logoPreview: string
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  loading: boolean
}

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'التكنولوجيا والبرمجيات' },
  { value: 'marketing', label: 'التسويق والإعلام' },
  { value: 'creative', label: 'التصميم والإبداع' },
  { value: 'business', label: 'الأعمال والخدمات' },
  { value: 'other', label: 'أخرى' },
]

export const WorkspaceSettingsSection = ({
  workspaceName,
  onWorkspaceNameChange,
  industry,
  onIndustryChange,
  logoPreview,
  onLogoChange,
  loading,
}: WorkspaceSettingsSectionProps) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography
        variant="h6"
        sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Home size={24} />
        إعدادات مساحة العمل
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Logo Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={logoPreview}
                variant="rounded"
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  borderRadius: 2,
                }}
              >
                {workspaceName.charAt(0).toUpperCase()}
              </Avatar>
              <input
                accept="image/*"
                id="workspace-logo-upload"
                type="file"
                hidden
                onChange={onLogoChange}
              />
              <label htmlFor="workspace-logo-upload">
                <IconButton
                  component="span"
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: -8,
                    right: -8,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.main', color: 'white' },
                  }}
                >
                  <Camera size={16} />
                </IconButton>
              </label>
            </Box>
            <Box>
              <Typography variant="subtitle2">شعار مساحة العمل</Typography>
              <Typography variant="caption" color="text.secondary">
                يظهر في القائمة الجانبية والتقارير
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="اسم مساحة العمل"
              value={workspaceName}
              onChange={e => onWorkspaceNameChange(e.target.value)}
              placeholder="مثلاً: شركة لارتـهـا"
            />

            <FormControl fullWidth>
              <InputLabel>المجال</InputLabel>
              <Select
                value={industry}
                label="المجال"
                onChange={e => onIndustryChange(e.target.value)}
              >
                {INDUSTRY_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      )}
    </Paper>
  )
}
