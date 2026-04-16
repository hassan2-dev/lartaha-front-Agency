/**
 * FilePreviewModal Component
 * Modal for previewing files (images, videos, audio)
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Avatar,
  Button,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { FileIcon } from './FileIcon'
import type { PreviewFile } from '../types'

interface FilePreviewModalProps {
  open: boolean
  file: PreviewFile | null
  onClose: () => void
}

export function FilePreviewModal({ open, file, onClose }: FilePreviewModalProps) {
  if (!file) return null

  const renderPreview = () => {
    switch (file.type) {
      case 'image':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={file.url}
              alt={file.filename}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          </Box>
        )

      case 'video':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
              }}
            >
              <source src={file.url} />
              متصفحك لا يدعم تشغيل الفيديو
            </video>
          </Box>
        )

      case 'audio':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={file.url} />
              متصفحك لا يدعم تشغيل الصوت
            </audio>
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
              {file.filename}
            </Typography>
          </Box>
        )

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                mx: 'auto',
                mb: 2,
              }}
            >
              <FileIcon fileType={file.type} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {file.filename}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
              لا يمكن معاينة هذا النوع من الملفات
            </Typography>
            <Button
              variant="contained"
              href={file.url}
              target="_blank"
              rel="noreferrer"
              sx={{ borderRadius: 999 }}
            >
              فتح الملف
            </Button>
          </Box>
        )
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.default',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontSize: '1.25rem', fontWeight: 500 }}>
          معاينة: {file.filename}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 300, display: 'flex', alignItems: 'center' }}>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  )
}
