/**
 * Toolbar Component
 * Main toolbar with view mode, filter, sort, and folder creation
 */

import { Box, Button, Tooltip, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import { ServerMinimalistic, Widget } from '@solar-icons/react'
import type { ViewMode, FileFilter, SortBy } from '../types'

interface ToolbarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  showTrash: boolean
  onToggleTrash: () => void
  fileFilter: FileFilter
  onFilterChange: (filter: FileFilter) => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  onCreateFolder: () => void
  disabled: boolean
}

export function Toolbar({
  viewMode,
  onViewModeChange,
  showTrash,
  onToggleTrash,
  fileFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  onCreateFolder,
  disabled,
}: ToolbarProps) {
  return (
    <Box
      sx={{
        mt: 2,
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <Tooltip title="عرض قائمة">
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            onClick={() => onViewModeChange('list')}
            disabled={disabled}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
          >
            <ServerMinimalistic weight="BoldDuotone" size={24} />
          </Button>
        </Tooltip>
        <Tooltip title="عرض شبكة">
          <Button
            variant={viewMode === 'grid' ? 'contained' : 'outlined'}
            onClick={() => onViewModeChange('grid')}
            disabled={disabled}
            sx={{ borderRadius: 999, minWidth: 'auto', p: 1 }}
          >
            <Widget weight="BoldDuotone" size={24} />
          </Button>
        </Tooltip>
        <Button
          variant="outlined"
          onClick={onToggleTrash}
          disabled={disabled}
          sx={{ borderRadius: 999 }}
        >
          {showTrash ? 'الملفات' : 'سلة المهملات'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {/* Filter Dropdown */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="filter-label">تصفية</InputLabel>
          <Select
            labelId="filter-label"
            value={fileFilter}
            onChange={e => onFilterChange(e.target.value as FileFilter)}
            disabled={disabled}
            label="تصفية"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="images">الصور</MenuItem>
            <MenuItem value="videos">الفيديو</MenuItem>
            <MenuItem value="documents">المستندات</MenuItem>
          </Select>
        </FormControl>

        {/* Sort Dropdown */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="sort-label">ترتيب</InputLabel>
          <Select
            labelId="sort-label"
            value={sortBy}
            onChange={e => onSortChange(e.target.value as SortBy)}
            disabled={disabled}
            label="ترتيب"
          >
            <MenuItem value="date">التاريخ</MenuItem>
            <MenuItem value="name">الاسم</MenuItem>
            <MenuItem value="size">الحجم</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={onCreateFolder}
          disabled={disabled}
          endIcon={<CreateNewFolderIcon />}
          sx={{ borderRadius: 999, gap: 1 }}
        >
          <span className="hidden md:inline">إنشاء مجلد</span>
        </Button>
      </Box>
    </Box>
  )
}
