import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
} from '@mui/material'

interface GeneralSettingsSectionProps {
  darkMode: boolean
  onDarkModeChange: (value: boolean) => void
  pushEnabled: boolean
  onPushToggle: () => void
  pushSupported: boolean
  autoUpload: boolean
  onAutoUploadChange: (value: boolean) => void
}

export const GeneralSettingsSection = ({
  darkMode,
  onDarkModeChange,
  pushEnabled,
  onPushToggle,
  pushSupported,
  autoUpload,
  onAutoUploadChange,
}: GeneralSettingsSectionProps) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        الإعدادات العامة
      </Typography>

      <List sx={{ py: 0 }}>
        <ListItem sx={{ px: 0 }}>
          <ListItemText primary="الوضع الليلي" secondary="تفعيل الوضع الداكن للتطبيق" />
          <ListItemSecondaryAction>
            <Switch
              checked={darkMode}
              onChange={e => onDarkModeChange(e.target.checked)}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>

        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />

        <ListItem sx={{ px: 0 }}>
          <ListItemText
            primary="إشعارات المتصفح والجوّال (Push)"
            secondary={
              pushSupported
                ? 'تلقي إشعارات فورية عند وصول رسائل جديدة'
                : 'هذا المتصفح لا يدعم الإشعارات الفورية'
            }
          />
          <ListItemSecondaryAction>
            <Switch
              checked={pushEnabled}
              onChange={onPushToggle}
              disabled={!pushSupported}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>

        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />

        <ListItem sx={{ px: 0 }}>
          <ListItemText primary="الرفع التلقائي" secondary="رفع الملفات تلقائياً عند تحديدها" />
          <ListItemSecondaryAction>
            <Switch
              checked={autoUpload}
              onChange={e => onAutoUploadChange(e.target.checked)}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>
      </List>
    </Paper>
  )
}
