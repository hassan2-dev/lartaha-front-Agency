import { Box, Avatar, Typography, useTheme, Skeleton } from '@mui/material'
import { useChatContext } from '../../contexts/ChatContext'
import { useAuth } from '../../contexts/AuthContext'

export default function MemberStories() {
  const theme = useTheme()
  const { user } = useAuth()
  const {
    memberList,
    sortedMemberList,
    usersById,
    openDirectConversation,
    openGeneralDiscussion,
    selectedConversationId,
    isGeneralDiscussionSelected,
    selectedConversation
  } = useChatContext()

  // Show skeleton while loading or if no members yet
  const isLoading = memberList.length === 0

  const SkeletonItem = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        minWidth: '60px',
      }}
    >
      <Skeleton
        variant="circular"
        width={56}
        height={56}
        sx={{
          border: '2px solid transparent',
        }}
      />
      <Skeleton
        variant="text"
        width={40}
        height={12}
        sx={{
          borderRadius: 1,
        }}
      />
    </Box>
  )

  return (
    <Box
      sx={{
        display: { xs: 'flex', md: 'none' },
        flexDirection: 'row',
        gap: 2,
        px: 2,
        py: 1.5,
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}
    >
      {/* General Discussion */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          minWidth: '60px',
          '&:hover': {
            opacity: 0.8,
          },
        }}
        onClick={openGeneralDiscussion}
      >
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={user?.workspaceLogo || "/favicon.svg"}
            sx={{
              width: 56,
              height: 56,
              border: isGeneralDiscussionSelected
                ? `3px solid ${theme.palette.primary.main}`
                : 'none',
              backgroundColor: theme.palette.primary.light,
              opacity: 1,
              transform: isGeneralDiscussionSelected ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease-in-out',
            }}
          />

          {isGeneralDiscussionSelected && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 20,
                height: 20,
                backgroundColor: theme.palette.secondary.main,
                border: `2px solid ${theme.palette.background.paper}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 'bold',
                  lineHeight: 1,
                }}
              >
                ✓
              </Typography>
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            textAlign: 'center',
            maxWidth: '70px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isGeneralDiscussionSelected
              ? theme.palette.secondary.main
              : theme.palette.text.primary,
            fontWeight: isGeneralDiscussionSelected ? 'bold' : 'bold',
          }}
        >
          عام
        </Typography>
      </Box>

      {isLoading ? (
        // Show skeleton items while loading
        Array.from({ length: 5 }).map((_, index) => <SkeletonItem key={`skeleton-${index}`} />)
      ) : (
        // Show actual members when loaded
        sortedMemberList.map((member) => {
          const userDetails = usersById.get(member.id)
          const isOnline = userDetails?.isOnline || false
          const hasUnread = member.hasUnread || false

          // Check if this member's direct conversation is currently selected
          const isMemberSelected = selectedConversation?.type === 'direct' &&
            selectedConversation.participantIds?.includes(member.id) &&
            selectedConversation.participantIds?.length === 2

          return (
            <Box
              key={member.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                minWidth: '60px',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
              onClick={() => openDirectConversation(member.id)}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={member.avatar || undefined}
                  sx={{
                    width: 56,
                    height: 56,
                    border: isMemberSelected
                      ? `3px solid ${theme.palette.primary.main}`
                      : 'none',
                    backgroundColor: theme.palette.primary.light,
                    opacity: 1,
                    transform: isMemberSelected ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </Avatar>
                {isOnline && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      right: 2,
                      width: 16,
                      height: 16,
                      backgroundColor: '#4CAF50',
                      border: `2px solid ${theme.palette.background.paper}`,
                      borderRadius: '50%',
                      zIndex: 1,
                    }}
                  />
                )}
                {hasUnread && !isMemberSelected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      backgroundColor: theme.palette.error.main,
                      border: `2px solid ${theme.palette.background.paper}`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: 'bold',
                        lineHeight: 1,
                      }}
                    >
                      !
                    </Typography>
                  </Box>
                )}
                {isMemberSelected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      left: 2,
                      width: 20,
                      height: 20,
                      backgroundColor: theme.palette.primary.main,
                      border: `2px solid ${theme.palette.background.paper}`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: 'bold',
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  textAlign: 'center',
                  maxWidth: '70px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isMemberSelected
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                  fontWeight: isMemberSelected ? 'bold' : 'normal',
                }}
              >
                {member.name}
              </Typography>
            </Box>
          )
        })
      )}
    </Box>
  )
}
