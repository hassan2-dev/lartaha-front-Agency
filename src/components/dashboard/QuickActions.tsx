import { Box, Card, CardContent, Typography } from '@mui/material'
import { Bolt } from '@solar-icons/react'
import type { QuickActionData } from '../../types/dashboard'

interface QuickActionsProps {
  actions: QuickActionData[]
}

export const QuickActions = ({ actions }: QuickActionsProps) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <Box sx={{ color: 'warning.main', display: 'flex' }}>
          <Bolt size={24} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          إجراءات سريعة
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {actions.map(action => (
          <Card
            key={action.title}
            onClick={action.disabled ? undefined : action.action}
            sx={{
              borderRadius: 2,
              border: '1px solid rgba(25, 118, 210, 0.12)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              cursor: action.disabled ? 'default' : 'pointer',
              opacity: action.disabled ? 0.65 : 1,
              transition: 'all 0.2s ease',
              boxShadow: 'none',
              '&:hover': action.disabled
                ? undefined
                : {
                    transform: 'translateY(-2px)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(25, 118, 210, 0.25)',
                  },
            }}
          >
            <CardContent sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  color: action.color,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {action.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.72 }}>
                  {action.description}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
