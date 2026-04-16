import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material'

interface UploadSettingsSectionProps {
  language: string
  onLanguageChange: (value: string) => void
  maxFileSize: string
  onMaxFileSizeChange: (value: string) => void
}

export const UploadSettingsSection = ({
  language,
  onLanguageChange,
  maxFileSize,
  onMaxFileSizeChange,
}: UploadSettingsSectionProps) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        إعدادات الرفع
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <FormControl fullWidth>
          <InputLabel>اللغة</InputLabel>
          <Select value={language} label="اللغة" onChange={e => onLanguageChange(e.target.value)}>
            <MenuItem value="ar">العربية</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="حجم الملف الأقصى (ميجابايت)"
          type="number"
          value={maxFileSize}
          onChange={e => onMaxFileSizeChange(e.target.value)}
          fullWidth
        />
      </Box>
    </Paper>
  )
}
