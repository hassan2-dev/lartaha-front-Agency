import { Box, Button, CircularProgress } from '@mui/material'
import { CheckSquare } from '@solar-icons/react'

interface SaveButtonProps {
  onSave: () => void
  loading: boolean
  disabled?: boolean
}

export const SaveButton = ({ onSave, loading, disabled = false }: SaveButtonProps) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={loading || disabled}
        startIcon={
          loading ? <CircularProgress size={20} color="inherit" /> : <CheckSquare size={20} />
        }
        sx={{ borderRadius: 999, px: 4 }}
      >
        {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </Box>
  )
}
