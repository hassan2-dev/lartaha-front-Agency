import {
  Box,
  Button,
  Popover,
  Typography,
  Stack,
} from '@mui/material'
import { EMOJIS } from '../../utils/chatUtils'

interface EmojiPickerProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  onEmojiSelect: (emoji: string) => void
}

export default function EmojiPicker({ anchorEl, onClose, onEmojiSelect }: EmojiPickerProps) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Box sx={{ p: 1, maxWidth: 260 }}>
        <Typography variant="caption" sx={{ opacity: 0.7, px: 0.5, display: 'block', mb: 0.5 }}>
          اختر إيموجي
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              size="small"
              variant="text"
              onClick={() => {
                onEmojiSelect(emoji)
                onClose()
              }}
              sx={{ minWidth: 36, fontSize: 18 }}
            >
              {emoji}
            </Button>
          ))}
        </Stack>
      </Box>
    </Popover>
  )
}
