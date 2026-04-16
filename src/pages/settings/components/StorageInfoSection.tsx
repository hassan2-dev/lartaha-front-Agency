import { Paper, Typography, Box, Button } from '@mui/material'
import { formatFileSize, calculateStoragePercentage } from '../utils'

interface StorageInfoSectionProps {
  usedStorage?: number
  totalStorage?: number
}

const DEFAULT_USED_STORAGE = 2.5 * 1024 * 1024 * 1024 // 2.5 GB
const DEFAULT_TOTAL_STORAGE = 10 * 1024 * 1024 * 1024 // 10 GB

export const StorageInfoSection = ({
  usedStorage = DEFAULT_USED_STORAGE,
  totalStorage = DEFAULT_TOTAL_STORAGE,
}: StorageInfoSectionProps) => {
  const percentage = calculateStoragePercentage(usedStorage, totalStorage)

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        معلومات التخزين
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          المساحة المستخدمة: {formatFileSize(usedStorage)} من {formatFileSize(totalStorage)}
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: 8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: 'primary.main',
            }}
          />
        </Box>
      </Box>

      <Button variant="outlined" size="small">
        ترقية التخزين
      </Button>
    </Paper>
  )
}
