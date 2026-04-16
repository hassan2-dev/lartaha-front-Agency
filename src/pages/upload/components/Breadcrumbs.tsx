/**
 * Breadcrumbs Component
 * Navigation breadcrumbs for folder path
 */

import { Box, Typography, Button } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'

interface Breadcrumb {
  label: string
  path: string
}

interface BreadcrumbsProps {
  items: Breadcrumb[]
  currentPath: string
  onNavigate: (path: string) => void
}

export function Breadcrumbs({ items, currentPath, onNavigate }: BreadcrumbsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      <FolderIcon sx={{ fontSize: 20, color: 'primary.main' }} />
      {items.map((crumb, idx) => (
        <Box key={`${crumb.path}_${idx}`} sx={{ display: 'flex', alignItems: 'center' }}>
          {idx > 0 && (
            <Typography variant="body2" sx={{ opacity: 0.5 }}>
              {'>'}
            </Typography>
          )}
          <Button
            size="small"
            onClick={() => onNavigate(crumb.path)}
            sx={{
              borderRadius: 999,
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              textTransform: 'none',
              fontWeight: crumb.path === currentPath ? 600 : 400,
              color: crumb.path === currentPath ? 'primary.main' : 'text.primary',
              bgcolor: crumb.path === currentPath ? 'primary.50' : 'transparent',
            }}
          >
            {crumb.label}
          </Button>
        </Box>
      ))}
      <Box sx={{ flex: '1 1 auto' }} />
    </Box>
  )
}
