// material-ui
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { useTheme, alpha } from '@mui/material/styles';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AgentDiagram from './AgentDiagram';
import TaskPipeline from './TaskPipeline';
import FileManager from './FileManager';
import { gridSpacing } from 'store/constant';

// icons
import {
  IconRobot,
  IconCircleFilled,
  IconListCheck,
  IconBolt,
  IconCpu,
  IconBrain
} from '@tabler/icons-react';

// ==============================|| AGENT HERO CARD ||============================== //

function AgentHeroCard() {
  const theme = useTheme();

  const stats = [
    { value: '6 / 6', label: 'Agents Online', icon: IconRobot },
    { value: '8', label: 'Tasks Today', icon: IconListCheck },
    { value: '87.5%', label: 'Success Rate', icon: IconBolt },
    { value: '56', label: 'Tools Available', icon: IconCpu }
  ];

  return (
    <MainCard
      border={false}
      content={false}
      sx={{
        bgcolor: 'primary.dark',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        '&:after': {
          content: '""',
          position: 'absolute',
          width: 260,
          height: 260,
          background: theme.palette.primary[800],
          borderRadius: '50%',
          top: -90,
          right: -80
        },
        '&:before': {
          content: '""',
          position: 'absolute',
          width: 200,
          height: 200,
          background: theme.palette.primary[800],
          borderRadius: '50%',
          top: -130,
          right: 60,
          opacity: 0.5
        }
      }}
    >
      <Box sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: alpha('#fff', 0.15),
                color: '#fff',
                borderRadius: '12px'
              }}
            >
              <IconBrain size={26} />
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                AI Agent System
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: alpha('#fff', 0.7), mt: 0.25 }}>
                Multi-Agent AI quản lý nhà hàng Siupo
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<IconCircleFilled size={8} />}
            label="All Systems Online"
            size="small"
            sx={{
              bgcolor: alpha('#fff', 0.15),
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.72rem',
              height: 26,
              backdropFilter: 'blur(4px)',
              '& .MuiChip-icon': { color: '#69f0ae' }
            }}
          />
        </Box>

        {/* Divider */}
        <Divider sx={{ borderColor: alpha('#fff', 0.15), mb: 2.5 }} />

        {/* Stats row */}
        <Grid container spacing={0}>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Grid key={i} size={{ xs: 6, sm: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    pr: { xs: 0, sm: i < 3 ? 2 : 0 },
                    pl: { xs: 0, sm: i > 0 ? 2 : 0 },
                    borderRight: i < 3 ? { xs: 'none', sm: `1px solid ${alpha('#fff', 0.15)}` } : 'none',
                    mb: { xs: 2, sm: 0 }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: alpha('#fff', 0.12),
                      color: alpha('#fff', 0.9),
                      borderRadius: '10px',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={18} />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: alpha('#fff', 0.65), mt: 0.25, lineHeight: 1.2 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </MainCard>
  );
}

// ==============================|| AGENT MANAGEMENT PAGE ||============================== //

export default function AgentManagement() {
  const theme = useTheme();

  const diagramSecondary = (
    <Chip
      label="Click node để xem chi tiết"
      size="small"
      sx={{
        bgcolor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.dark,
        fontSize: '0.72rem',
        height: 24,
        fontWeight: 500
      }}
    />
  );

  return (
    <Grid container spacing={gridSpacing}>
      {/* Hero Card — full width */}
      <Grid size={12}>
        <AgentHeroCard />
      </Grid>

      {/* Agent Orchestration Diagram */}
      <Grid size={12}>
        <MainCard title="Kiến trúc Orchestration" secondary={diagramSecondary}>
          <AgentDiagram />
        </MainCard>
      </Grid>

      {/* Task Pipeline + File Manager */}
      <Grid size={{ xs: 12, md: 7 }}>
        <MainCard
          title="Task Pipeline"
          sx={{ height: { xs: 'auto', md: 540 }, display: 'flex', flexDirection: 'column' }}
          contentSX={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: '16px !important',
            '&:last-child': { pb: '16px !important' }
          }}
        >
          <TaskPipeline hideHeader />
        </MainCard>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <MainCard
          title="File Manager"
          sx={{ height: { xs: 'auto', md: 540 }, display: 'flex', flexDirection: 'column' }}
          contentSX={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: '16px !important',
            '&:last-child': { pb: '16px !important' }
          }}
        >
          <FileManager hideHeader />
        </MainCard>
      </Grid>
    </Grid>
  );
}
