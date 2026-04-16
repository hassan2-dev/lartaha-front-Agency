/**
 * ThumbnailTypeBadge Component
 * Shows a small badge with file type icon on thumbnails
 */

import { Box } from '@mui/material'
import { FileIcon } from './FileIcon'
import type { FileType } from '../types'

interface ThumbnailTypeBadgeProps {
  fileType: FileType | string
  size?: number
}

export function ThumbnailTypeBadge({ fileType, size = 16 }: ThumbnailTypeBadgeProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 4,
        bottom: 4,
        width: size + 8,
        height: size + 8,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <Box sx={{ display: 'inline-flex', color: 'white', '& svg': { fontSize: size } }}>
        <FileIcon fileType={fileType} />
      </Box>
    </Box>
  )
}
