/**
 * CopyLinkButton Component
 * Button to copy file URL to clipboard with feedback
 */

import { useState } from 'react'
import { Button, Tooltip } from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'
import CheckIcon from '@mui/icons-material/Check'

interface CopyLinkButtonProps {
  url: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Tooltip title={copied ? 'تم نسخ الرابط!' : 'نسخ الرابط'}>
      <Button
        size="small"
        variant="text"
        onClick={e => {
          e.stopPropagation()
          void handleCopy()
        }}
        sx={{
          borderRadius: 999,
          minWidth: 'auto',
          p: 1,
          color: copied ? 'success.main' : 'text.primary',
        }}
      >
        {copied ? (
          <CheckIcon />
        ) : (
          <LinkIcon
            sx={{
              transform: 'rotate(-45deg)',
              color: 'text.secondary',
            }}
          />
        )}
      </Button>
    </Tooltip>
  )
}
