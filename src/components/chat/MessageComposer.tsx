import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  Avatar,
} from '@mui/material'
import {
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Send as SendIcon,
  Tag as TagIcon,
} from '@mui/icons-material'
import EmojiPicker from './EmojiPicker'
import MentionDialog from './MentionDialog'
import { useChatContext } from '../../contexts/ChatContext'
import { Plain2 } from '@solar-icons/react'

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

  return (
    <>
      <Divider sx={{ mt: 1, mb: 1 }} />

      {composerMentions.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
          {composerMentions.map((mention, idx) => (
            <Chip
              key={`${mention.type}_${mention.id}_${idx}`}
              onDelete={() => removeMention(mention)}
              label={`${mention.type === 'member' ? '@' : mention.type === 'task' ? '#' : '📎'} ${mention.label}`}
            />
          ))}
        </Stack>
      )}

      {composerFiles.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
          {composerFiles.map((file, idx) => (
            <Chip key={`${file.name}_${idx}`} label={file.name} onDelete={() => removeComposerFile(idx)} />
          ))}
        </Stack>
      )}

      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={6}
        value={composerText}
        onChange={(e) => setComposerText(e.target.value)}
        placeholder="اكتب رسالتك هنا... استخدم @ لذكر عضو"
      />

      {atMentionQuery !== null && memberMentionSuggestions.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1, p: 0.5, borderRadius: 2 }}>
          <Typography variant="caption" sx={{ px: 1, py: 0.5, opacity: 0.7, display: 'block' }}>
            اقتراحات الأعضاء
          </Typography>
          <List sx={{ p: 0 }}>
            {memberMentionSuggestions.map((member) => (
              <ListItemButton
                key={`mention_member_${member.id}`}
                onClick={() => applyMemberMentionFromInput(member.id, member.name)}
                sx={{ borderRadius: 1.5 }}
              >
                <Avatar src={member.avatar || undefined} sx={{ width: 24, height: 24, mr: 1, fontSize: 11 }}>
                  {member.name.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText primary={member.name} secondary={member.email} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<TagIcon />}
          onClick={() => {
            setMentionType('task')
            setMentionDialogOpen(true)
          }}
        >
          Tags
        </Button>
        <Button
          variant="outlined"
          startIcon={<TagIcon />}
          onClick={() => {
            setMentionType('file')
            setMentionDialogOpen(true)
          }}
        >
          Files
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmojiIcon />}
          onClick={(event) => setEmojiAnchorEl(event.currentTarget)}
        >
          إيموجي
        </Button>
        <Button variant="outlined" startIcon={<AttachFileIcon />} onClick={() => fileInputRef.current?.click()}>
          إرفاق ملف
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button sx={{ gap: 1 }} variant="contained" startIcon={<Plain2 weight='BoldDuotone' />} disabled={sending} onClick={handleSend}>
          {sending ? 'إرسال...' : 'إرسال'}
        </Button>
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
    </>
  )
}
