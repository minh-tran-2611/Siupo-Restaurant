import { useState } from 'react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha } from '@mui/material/styles';

// design tokens — same source as palette.jsx
import C from 'assets/scss/_themes-vars.module.scss';

// icons
import { IconChevronRight, IconClock, IconCheck, IconX, IconLoader2, IconRefresh, IconInbox } from '@tabler/icons-react';

import agentApi from 'api/agentApi';

// ==============================|| TASK PIPELINE ||============================== //

const statusConfig = {
  completed: { color: C.successDark, bg: C.successLight, accent: C.successMain, icon: IconCheck, label: 'Hoàn thành' },
  failed: { color: C.errorMain, bg: C.errorLight, accent: C.errorMain, icon: IconX, label: 'Thất bại' },
  processing: { color: C.secondaryMain, bg: C.secondaryLight, accent: C.secondaryMain, icon: IconLoader2, label: 'Đang xử lý' }
};

const fmtTime = (epochMs) => {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtDuration = (ms, status) => {
  if (status === 'processing' || ms == null) return '...';
  return `${(ms / 1000).toFixed(1)}s`;
};

// Map BE row → UI row
const mapTask = (t) => ({
  id: t.id,
  title: t.user_message,
  status: t.status,
  timestamp: fmtTime(t.started_at),
  duration: fmtDuration(t.duration_ms, t.status),
  tools: t.tools || [],
  response: t.response,
  topic: t.topic
});

function TaskItem({ task, isExpanded, onToggle }) {
  const theme = useTheme();
  const status = statusConfig[task.status] || statusConfig.completed;
  const StatusIcon = status.icon;

  return (
    <Box
      onClick={onToggle}
      sx={{
        p: 1.5,
        borderRadius: 2,
        cursor: 'pointer',
        border: `1px solid ${alpha(theme.palette.grey[200], 0.8)}`,
        bgcolor: isExpanded ? alpha(status.accent, 0.03) : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: alpha(status.accent, 0.05),
          borderColor: alpha(status.accent, 0.3),
          transform: 'translateX(4px)'
        }
      }}
    >
      {/* Main row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Status icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: status.bg,
            flexShrink: 0
          }}
        >
          <StatusIcon
            size={16}
            color={status.color}
            style={task.status === 'processing' ? { animation: 'spin 1.5s linear infinite' } : {}}
          />
        </Box>

        {/* Task info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Tooltip title={task.title} placement="top-start" arrow enterDelay={500}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: theme.palette.grey[800],
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {task.title}
            </Typography>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <IconClock size={11} color={theme.palette.grey[400]} />
            <Typography variant="caption" sx={{ color: theme.palette.grey[500], fontSize: '0.68rem' }}>
              {task.timestamp}
            </Typography>
            {task.duration !== '...' && (
              <Typography variant="caption" sx={{ color: theme.palette.grey[400], fontSize: '0.68rem' }}>
                · {task.duration}
              </Typography>
            )}
            <Typography
              variant="caption"
              sx={{
                color: status.color,
                fontSize: '0.65rem',
                fontWeight: 600,
                ml: 0.5,
                textTransform: 'uppercase',
                letterSpacing: 0.3
              }}
            >
              · {status.label}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Expanded details */}
      {isExpanded && (
        <Fade in timeout={300}>
          <Box sx={{ mt: 1.5, pl: 5.5 }}>
            {/* Orchestrator tools used */}
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.grey[500],
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  display: 'block',
                  mb: 0.5
                }}
              >
                Orchestrator tools
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {task.tools.length > 0 ? (
                  task.tools.map((tool, i) => (
                    <Chip
                      key={i}
                      label={tool}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        bgcolor: alpha(status.accent, 0.08),
                        color: status.color,
                        fontFamily: 'monospace',
                        '& .MuiChip-label': { px: 0.75 }
                      }}
                    />
                  ))
                ) : (
                  <Chip
                    label="LLM only — no tool calls"
                    size="small"
                    sx={{ height: 20, fontSize: '0.6rem', bgcolor: alpha(theme.palette.grey[400], 0.1) }}
                  />
                )}
              </Box>
            </Box>

            {/* Response */}
            {task.response ? (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.grey[500],
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  Response
                </Typography>
                <Box
                  className="markdown-body"
                  sx={{
                    bgcolor: alpha(status.accent, 0.05),
                    border: `1px solid ${alpha(status.accent, 0.15)}`,
                    borderRadius: 1.5,
                    p: 1.25,
                    color: task.status === 'failed' ? C.errorDark : theme.palette.grey[800],
                    fontSize: '0.78rem',
                    lineHeight: 1.65,
                    // ── Markdown element styles ────────────────────────────────
                    '& > *:first-of-type': { mt: 0 },
                    '& > *:last-child': { mb: 0 },
                    '& p': { my: 0.5 },
                    '& h1, & h2, & h3, & h4': {
                      fontWeight: 600,
                      mt: 1.25,
                      mb: 0.5,
                      lineHeight: 1.3,
                      color: theme.palette.grey[900]
                    },
                    '& h1': { fontSize: '0.95rem' },
                    '& h2': { fontSize: '0.88rem' },
                    '& h3': { fontSize: '0.82rem' },
                    '& h4': { fontSize: '0.78rem' },
                    '& strong': { fontWeight: 600, color: theme.palette.grey[900] },
                    '& em': { fontStyle: 'italic' },
                    '& ul, & ol': { pl: 2.5, my: 0.5 },
                    '& li': { my: 0.25 },
                    '& li > p': { my: 0 },
                    '& blockquote': {
                      borderLeft: `3px solid ${alpha(status.accent, 0.4)}`,
                      pl: 1.25,
                      ml: 0,
                      my: 0.75,
                      color: theme.palette.grey[600],
                      fontStyle: 'italic'
                    },
                    '& code': {
                      bgcolor: alpha(theme.palette.grey[500], 0.12),
                      color: theme.palette.grey[800],
                      px: 0.5,
                      py: 0.15,
                      borderRadius: 0.75,
                      fontSize: '0.72rem',
                      fontFamily: '"Roboto Mono", monospace'
                    },
                    '& pre': {
                      bgcolor: alpha(theme.palette.grey[900], 0.92),
                      color: theme.palette.grey[100],
                      p: 1.25,
                      borderRadius: 1.5,
                      my: 0.75,
                      overflowX: 'auto',
                      fontSize: '0.72rem',
                      lineHeight: 1.5,
                      '& code': {
                        bgcolor: 'transparent',
                        color: 'inherit',
                        p: 0,
                        fontSize: 'inherit'
                      }
                    },
                    '& table': {
                      borderCollapse: 'collapse',
                      my: 0.75,
                      fontSize: '0.74rem',
                      width: '100%'
                    },
                    '& th, & td': {
                      border: `1px solid ${alpha(theme.palette.grey[400], 0.4)}`,
                      px: 1,
                      py: 0.5,
                      textAlign: 'left'
                    },
                    '& th': {
                      bgcolor: alpha(status.accent, 0.08),
                      fontWeight: 600
                    },
                    '& a': {
                      color: theme.palette.primary.main,
                      textDecoration: 'underline'
                    },
                    '& hr': {
                      border: 'none',
                      borderTop: `1px dashed ${alpha(theme.palette.grey[400], 0.5)}`,
                      my: 1
                    },
                    '& img': { maxWidth: '100%', borderRadius: 1 }
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.response}</ReactMarkdown>
                </Box>
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: theme.palette.grey[400], fontSize: '0.7rem', fontStyle: 'italic' }}>
                Đang xử lý, chưa có response...
              </Typography>
            )}
          </Box>
        </Fade>
      )}
    </Box>
  );
}

export default function TaskPipeline({ hideHeader = false }) {
  const theme = useTheme();
  const [expandedTask, setExpandedTask] = useState(null);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['agent-tasks', 50],
    () => agentApi.listTasks({ limit: 50 }),
    {
      revalidateOnFocus: true,
      refreshInterval: 0
    }
  );

  const toggleTask = (id) => {
    setExpandedTask(expandedTask === id ? null : id);
  };

  const tasks = (data?.tasks || []).map(mapTask);

  // Sort: processing first, then by timestamp desc (already sorted server-side, this is defensive)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'processing' && b.status !== 'processing') return -1;
    if (b.status === 'processing' && a.status !== 'processing') return 1;
    return 0;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header — ẩn khi dùng trong MainCard có title */}
      {!hideHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: '1rem', fontWeight: 600, color: theme.palette.grey[800] }}>
              Task Pipeline
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.grey[500] }}>
              {completedCount} completed · {failedCount} failed
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => mutate()} disabled={isValidating} sx={{ color: theme.palette.primary.main }}>
              {isValidating ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {hideHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: theme.palette.grey[500] }}>
            {completedCount} hoàn thành · {failedCount} thất bại
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => mutate()} disabled={isValidating} sx={{ width: 24, height: 24 }}>
              {isValidating ? <CircularProgress size={12} /> : <IconRefresh size={14} color={theme.palette.grey[500]} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Task list */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          pr: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.grey[300], 0.6),
            borderRadius: 2,
            '&:hover': { bgcolor: theme.palette.grey[400] }
          }
        }}
      >
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && error && (
          <Box sx={{ textAlign: 'center', py: 4, color: C.errorMain }}>
            <Typography variant="caption">Không tải được task: {error.message}</Typography>
          </Box>
        )}

        {!isLoading && !error && sortedTasks.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, color: theme.palette.grey[400] }}>
            <IconInbox size={32} />
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Chưa có task nào. Thử chat với AI để tạo task đầu tiên.
            </Typography>
          </Box>
        )}

        {!isLoading &&
          !error &&
          sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} isExpanded={expandedTask === task.id} onToggle={() => toggleTask(task.id)} />
          ))}
      </Box>

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}
