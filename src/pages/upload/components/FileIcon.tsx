/**
 * FileIcon Component
 * Displays appropriate icon based on file type
 */

import ImageIcon from '@mui/icons-material/Image'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import DescriptionIcon from '@mui/icons-material/Description'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LockIcon from '@mui/icons-material/Lock'
import type { FileType } from '../types'

interface FileIconProps {
  fileType: FileType | string
  locked?: boolean
}

export function FileIcon({ fileType, locked = false }: FileIconProps) {
  if (locked) {
    return <LockIcon />
  }

  switch (fileType) {
    case 'image':
      return <ImageIcon />
    case 'video':
      return <VideoFileIcon />
    case 'audio':
      return <AudioFileIcon />
    case 'document':
      return <DescriptionIcon />
    default:
      return <InsertDriveFileIcon />
  }
}
