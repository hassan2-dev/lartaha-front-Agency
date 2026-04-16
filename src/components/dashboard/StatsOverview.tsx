import { Box, Card, CardContent, Typography } from '@mui/material'
import type { OverviewCardData } from '../../types/dashboard'

interface StatsOverviewProps {
  cards: OverviewCardData[]
}

export const StatsOverview = ({ cards }: StatsOverviewProps) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
        ملخص البيانات
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {cards.map(item => (
          <Card
            key={item.title}
            sx={{
              borderRadius: 2,
              border: '1px solid rgba(25, 118, 210, 0.12)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              height: '100%',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.72, mb: 1 }}>
                {item.title}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: item.color, mb: 0.5 }}>
                {item.value}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.72 }}>
                {item.note}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
