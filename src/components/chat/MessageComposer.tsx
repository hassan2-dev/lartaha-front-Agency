import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  InputBase,
} from '@mui/material'
import {
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Tag as TagIcon,
  InsertDriveFile as FileTagIcon,
} from '@mui/icons-material'
import EmojiPicker from './EmojiPicker'
import MentionDialog from './MentionDialog'
import { useChatContext } from '../../contexts/ChatContext'
import { useCallback, useRef } from 'react'
import { Plain } from '@solar-icons/react'

const MAX_CHARS = 2000

export default function MessageComposer() {
  const {
    composerText,
    composerMentions,
    composerFiles,
    sending,
    emojiAnchorEl,
    mentionDialogOpen,
    mentionType,
    atMentionQuery,
    memberMentionSuggestions,
    bootstrap,
    setComposerText,
    setEmojiAnchorEl,
    setMentionDialogOpen,
    setMentionType,
    handleFileChange,
    handleSend,
    removeMention,
    removeComposerFile,
    addEmoji,
    addMention,
    applyMemberMentionFromInput,
    fileInputRef,
  } = useChatContext()

  const textareaRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return
      const fakeEvent = {
        target: { files: e.dataTransfer.files, value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileChange(fakeEvent)
    },
    [handleFileChange]
  )

  const canSend = (composerText.trim().length > 0 || composerFiles.length > 0) && !sending
  const charCount = composerText.length
  const isNearLimit = charCount > MAX_CHARS * 0.85

  return (
    <Box
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Divider sx={{ mb: 1 }} />

      {/* Mentions chips */}
      {composerMentions.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 0.75, px: 0.5 }}>
          {composerMentions.map((mention, idx) => (
            <Chip
              key={`${mention.type}_${mention.id}_${idx}`}
              size="small"
              onDelete={() => removeMention(mention)}
              label={`${mention.type === 'member' ? '@' : mention.type === 'task' ? '#' : '📎'} ${mention.label}`}
              sx={{ fontSize: 12 }}
            />
          ))}
        </Stack>
      )}

      {/* File chips */}
      {composerFiles.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 0.75, px: 0.5 }}>
          {composerFiles.map((file, idx) => (
            <Chip
              key={`${file.name}_${idx}`}
              size="small"
              icon={<AttachFileIcon />}
              label={file.name}
              onDelete={() => removeComposerFile(idx)}
              sx={{ fontSize: 12, maxWidth: 200 }}
            />
          ))}
        </Stack>
      )}

      {/* @mention suggestions dropdown */}
      {atMentionQuery !== null && memberMentionSuggestions.length > 0 && (
        <Paper
          variant="outlined"
          sx={{ mb: 1, p: 0.5, borderRadius: 2, maxHeight: 180, overflowY: 'auto' }}
        >
          <Typography variant="caption" sx={{ px: 1, py: 0.5, opacity: 0.65, display: 'block' }}>
            اقتراحات الأعضاء
          </Typography>
          <List sx={{ p: 0 }}>
            {memberMentionSuggestions.map(member => (
              <ListItemButton
                key={`mention_member_${member.id}`}
                onClick={() => applyMemberMentionFromInput(member.id, member.name)}
                sx={{ borderRadius: 1.5, py: 0.5 }}
              >
                <Avatar src={member.avatar || undefined} sx={{ width: 26, height: 26, mr: 1, fontSize: 12 }}>
                  {member.name.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={member.name}
                  secondary={member.email}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {/* Text area + send row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          pe: 1.5,
          p: 0.75,
          bgcolor: 'background.paper',
          '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(59,130,246,0.15)' },
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <InputBase
          inputRef={textareaRef}
          multiline
          minRows={1}
          maxRows={6}
          value={composerText}
          onChange={e => {
            if (e.target.value.length <= MAX_CHARS) setComposerText(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك... استخدم @ لذكر عضو"
          sx={{ flex: 1, fontSize: 14, lineHeight: 1.5, py: 0.25 }}
          inputProps={{ dir: composerText ? 'auto' : "rtl" }}
        />

        {/* Send button */}
        <Tooltip title="إرسال (Ctrl+Enter)">
          <span>
            <IconButton
              size="small"
              color="primary"
              disabled={!canSend}
              onClick={() => void handleSend()}
              sx={{
                width: 36,
                height: 36,
                bgcolor: canSend ? 'primary.main' : 'action.disabledBackground',
                color: canSend ? '#fff' : 'text.disabled',
                '&:hover': { bgcolor: canSend ? 'primary.dark' : undefined },
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <Plain style={{ fontSize: 18, transform: "rotate(-90deg)" }} weight='Bold' />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Toolbar row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.5, px: 0.5 }}>
        <Tooltip title="إيموجي">
          <IconButton size="small" onClick={e => setEmojiAnchorEl(e.currentTarget)} sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}>
            <EmojiIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="إرفاق ملف">
          <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}>
            <AttachFileIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="إشارة مهمة">
          <IconButton
            size="small"
            onClick={() => { setMentionType('task'); setMentionDialogOpen(true) }}
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            <TagIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="إشارة ملف">
          <IconButton
            size="small"
            onClick={() => { setMentionType('file'); setMentionDialogOpen(true) }}
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            <FileTagIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        {/* Character counter */}
        {charCount > 0 && (
          <Typography
            variant="caption"
            sx={{ opacity: isNearLimit ? 1 : 0.4, color: charCount >= MAX_CHARS ? 'error.main' : isNearLimit ? 'warning.main' : 'text.secondary', fontSize: 11 }}
          >
            {charCount}/{MAX_CHARS}
          </Typography>
        )}

        <Typography variant="caption" sx={{ opacity: 0.35, fontSize: 10, ml: 0.5 }}>
          Ctrl+Enter للإرسال
        </Typography>
      </Box>

      <input ref={fileInputRef} hidden type="file" multiple onChange={handleFileChange} />

      <EmojiPicker
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        onEmojiSelect={addEmoji}
      />

      <MentionDialog
        open={mentionDialogOpen}
        onClose={() => setMentionDialogOpen(false)}
        mentionType={mentionType}
        bootstrap={bootstrap}
        onAddMention={addMention}
      />
    </Box>
  )
}
