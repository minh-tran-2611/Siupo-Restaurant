import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';

// design tokens — same source as palette.jsx
import C from 'assets/scss/_themes-vars.module.scss';

// icons
import { IconChevronRight, IconClock, IconCheck, IconX, IconLoader2 } from '@tabler/icons-react';

// ==============================|| TASK PIPELINE ||============================== //

const MOCK_TASKS = [
  {
    id: 1,
    title: 'Cho anh xem doanh thu tháng 4',
    status: 'completed',
    timestamp: '14:21',
    duration: '2.1s',
    tools: ['call_analytics_agent'],
    response:
      'Doanh thu tháng 4: 125.6M VNĐ, tăng 12% so với tháng trước. Top seller: Phở Bò (320 phần). Khuyến nghị: Tăng combo Gia Đình vào cuối tuần.'
  },
  {
    id: 2,
    title: 'Thêm sản phẩm Bún Bò Huế giá 55.000đ vào menu',
    status: 'completed',
    timestamp: '14:18',
    duration: '1.4s',
    tools: ['call_management_agent'],
    response: 'Đã tạo sản phẩm "Bún Bò Huế" trong danh mục "Món Chính", giá 55.000đ, status: AVAILABLE.'
  },
  {
    id: 3,
    title: 'Tìm khách hàng VIP đặt trên 10 đơn mỗi tháng',
    status: 'completed',
    timestamp: '14:15',
    duration: '0.9s',
    tools: ['call_management_agent'],
    response: 'Tìm thấy 23 khách hàng VIP (đặt >10 đơn/tháng). Top: Nguyễn Văn A (45 đơn).'
  },
  {
    id: 4,
    title: 'Cập nhật banner trang chủ thành banner mới',
    status: 'failed',
    timestamp: '14:10',
    duration: '3.2s',
    tools: ['call_management_agent'],
    response: 'Lỗi: Banner position Home1 đã bị chiếm. Không thể cập nhật.'
  },
  {
    id: 5,
    title: 'Tạo voucher giảm 20% dịp lễ tên HOLIDAY20',
    status: 'completed',
    timestamp: '13:55',
    duration: '1.8s',
    tools: ['call_management_agent'],
    response: 'Voucher HOLIDAY20 đã tạo: Giảm 20%, tối đa 100K, từ 25/04 - 05/05.'
  },
  {
    id: 6,
    title: 'Thống kê đơn hàng bị hủy tuần này, phân tích nguyên nhân',
    status: 'completed',
    timestamp: '13:40',
    duration: '2.8s',
    tools: ['call_analytics_agent', 'search_documents'],
    response: '18 đơn bị hủy (8.2%). Nguyên nhân chính: khách không thanh toán (44%), hết hàng (28%).'
  },
  {
    id: 7,
    title: 'Chính sách hoàn tiền của nhà hàng là gì?',
    status: 'completed',
    timestamp: '13:20',
    duration: '1.2s',
    tools: ['search_documents'],
    response:
      'Theo chính sách hiện tại, khách được hoàn 100% nếu hủy trước 24h, 50% nếu hủy trước 12h, không hoàn nếu hủy dưới 12h.'
  },
  {
    id: 8,
    title: 'Báo cáo hiệu suất sản phẩm và combo Q2',
    status: 'processing',
    timestamp: '14:22',
    duration: '...',
    tools: ['call_analytics_agent'],
    response: null
  }
];

const statusConfig = {
  completed: { color: C.successDark, bg: C.successLight, accent: C.successMain, icon: IconCheck, label: 'Hoàn thành' },
  failed: { color: C.errorMain, bg: C.errorLight, accent: C.errorMain, icon: IconX, label: 'Thất bại' },
  processing: { color: C.secondaryMain, bg: C.secondaryLight, accent: C.secondaryMain, icon: IconLoader2, label: 'Đang xử lý' }
};

function TaskItem({ task, isExpanded, onToggle }) {
  const theme = useTheme();
  const status = statusConfig[task.status];
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
                  sx={{
                    bgcolor: alpha(status.accent, 0.05),
                    border: `1px solid ${alpha(status.accent, 0.15)}`,
                    borderRadius: 1.5,
                    p: 1
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: task.status === 'failed' ? C.errorDark : theme.palette.grey[700],
                      lineHeight: 1.6,
                      fontSize: '0.72rem'
                    }}
                  >
                    {task.response}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography
                variant="caption"
                sx={{ color: theme.palette.grey[400], fontSize: '0.7rem', fontStyle: 'italic' }}
              >
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

  const toggleTask = (id) => {
    setExpandedTask(expandedTask === id ? null : id);
  };

  // Sort: processing first, then keep order
  const sortedTasks = [...MOCK_TASKS].sort((a, b) => {
    if (a.status === 'processing' && b.status !== 'processing') return -1;
    if (b.status === 'processing' && a.status !== 'processing') return 1;
    return 0;
  });

  const completedCount = MOCK_TASKS.filter((t) => t.status === 'completed').length;
  const failedCount = MOCK_TASKS.filter((t) => t.status === 'failed').length;

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
              {completedCount} completed · {failedCount} failed · today
            </Typography>
          </Box>
          <Tooltip title="View all tasks">
            <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
              <IconChevronRight size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {hideHeader && (
        <Typography variant="caption" sx={{ color: theme.palette.grey[500], mb: 1.5, display: 'block' }}>
          {completedCount} hoàn thành · {failedCount} thất bại · hôm nay
        </Typography>
      )}

      {/* Task list */}
      <Box
        sx={{
          flex: 1,
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
        {sortedTasks.map((task) => (
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
