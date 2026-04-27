import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';

// icons
import { IconChevronRight, IconClock, IconCheck, IconX, IconLoader2 } from '@tabler/icons-react';

// ==============================|| TASK PIPELINE ||============================== //

const MOCK_TASKS = [
  {
    id: 1,
    title: 'Phân tích doanh thu tháng 4',
    agent: 'analytics',
    agentIcon: '📊',
    agentColor: '#ff9f0d',
    status: 'completed',
    timestamp: '14:21',
    duration: '2.1s',
    toolCalls: 3,
    tools: ['get_analytics_summary', 'get_revenue_analytics', 'get_product_analytics'],
    result: 'Doanh thu tháng 4: 125.6M VNĐ, tăng 12% so với tháng trước. Top seller: Phở Bò (320 phần). Khuyến nghị: Tăng combo Gia Đình vào cuối tuần.'
  },
  {
    id: 2,
    title: 'Thêm sản phẩm Bún Bò Huế giá 55.000đ',
    agent: 'management',
    agentIcon: '⚙️',
    agentColor: '#00897b',
    status: 'completed',
    timestamp: '14:18',
    duration: '1.4s',
    toolCalls: 2,
    tools: ['get_categories', 'create_product'],
    result: 'Đã tạo sản phẩm "Bún Bò Huế" trong danh mục "Món Chính", giá 55.000đ, status: AVAILABLE.'
  },
  {
    id: 3,
    title: 'Tìm kiếm khách hàng VIP',
    agent: 'management',
    agentIcon: '⚙️',
    agentColor: '#00897b',
    status: 'completed',
    timestamp: '14:15',
    duration: '0.9s',
    toolCalls: 1,
    tools: ['get_all_customers'],
    result: 'Tìm thấy 23 khách hàng VIP (đặt >10 đơn/tháng). Top: Nguyễn Văn A (45 đơn).'
  },
  {
    id: 4,
    title: 'Cập nhật banner trang chủ',
    agent: 'management',
    agentIcon: '⚙️',
    agentColor: '#00897b',
    status: 'failed',
    timestamp: '14:10',
    duration: '3.2s',
    toolCalls: 2,
    tools: ['get_all_banners', 'update_banner'],
    result: 'Lỗi: Banner position Home1 đã bị chiếm. Không thể cập nhật.'
  },
  {
    id: 5,
    title: 'Tạo voucher giảm 20% dịp lễ',
    agent: 'management',
    agentIcon: '⚙️',
    agentColor: '#00897b',
    status: 'completed',
    timestamp: '13:55',
    duration: '1.8s',
    toolCalls: 2,
    tools: ['get_voucher_by_code', 'create_voucher'],
    result: 'Voucher HOLIDAY20 đã tạo: Giảm 20%, tối đa 100K, từ 25/04 - 05/05.'
  },
  {
    id: 6,
    title: 'Thống kê đơn hàng bị hủy tuần này',
    agent: 'analytics',
    agentIcon: '📊',
    agentColor: '#ff9f0d',
    status: 'completed',
    timestamp: '13:40',
    duration: '2.8s',
    toolCalls: 4,
    tools: ['get_order_analytics', 'get_all_orders_admin', 'get_order_detail_admin', 'get_analytics_insights'],
    result: '18 đơn bị hủy (8.2%). Nguyên nhân chính: khách không thanh toán (44%), hết hàng (28%).'
  },
  {
    id: 7,
    title: 'Memory consolidation hàng ngày',
    agent: 'consolidate',
    agentIcon: '🔄',
    agentColor: '#ffb84d',
    status: 'completed',
    timestamp: '03:00',
    duration: '4.5s',
    toolCalls: 0,
    tools: [],
    result: '24 memories → 8 consolidated summaries. Đã xóa 24 bản gốc.'
  },
  {
    id: 8,
    title: 'Báo cáo hiệu suất sản phẩm',
    agent: 'analytics',
    agentIcon: '📊',
    agentColor: '#ff9f0d',
    status: 'processing',
    timestamp: '14:22',
    duration: '...',
    toolCalls: 2,
    tools: ['get_product_analytics', 'get_all_combos'],
    result: null
  }
];

const statusConfig = {
  completed: { color: '#00c853', bg: '#e8f5e9', icon: IconCheck, label: 'Hoàn thành' },
  failed: { color: '#f44336', bg: '#ffebee', icon: IconX, label: 'Thất bại' },
  processing: { color: '#ff9f0d', bg: '#fff5e6', icon: IconLoader2, label: 'Đang xử lý' }
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
        bgcolor: isExpanded ? alpha(task.agentColor, 0.03) : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: alpha(task.agentColor, 0.05),
          borderColor: alpha(task.agentColor, 0.3),
          transform: 'translateX(4px)'
        }
      }}
    >
      {/* Main row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Agent icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(task.agentColor, 0.1),
            fontSize: '16px',
            flexShrink: 0
          }}
        >
          {task.agentIcon}
        </Box>

        {/* Task info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
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
          </Box>
        </Box>

        {/* Status */}
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: status.bg,
            flexShrink: 0
          }}
        >
          <StatusIcon
            size={13}
            color={status.color}
            style={task.status === 'processing' ? { animation: 'spin 1.5s linear infinite' } : {}}
          />
        </Box>
      </Box>

      {/* Expanded details */}
      {isExpanded && (
        <Fade in timeout={300}>
          <Box sx={{ mt: 1.5, pl: 5.5 }}>
            {/* Tools used */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {task.tools.map((tool, i) => (
                <Chip
                  key={i}
                  label={tool}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    bgcolor: alpha(task.agentColor, 0.08),
                    color: task.agentColor,
                    fontFamily: 'monospace'
                  }}
                />
              ))}
              {task.tools.length === 0 && (
                <Chip label="No tools (LLM only)" size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
              )}
            </Box>

            {/* Result */}
            {task.result && (
              <Box
                sx={{
                  bgcolor: task.status === 'failed'
                    ? alpha('#f44336', 0.06)
                    : alpha(task.agentColor, 0.05),
                  border: `1px solid ${task.status === 'failed' ? alpha('#f44336', 0.18) : alpha(task.agentColor, 0.15)}`,
                  borderRadius: 1.5,
                  p: 1,
                  mt: 0.5
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: task.status === 'failed' ? '#c62828' : theme.palette.grey[600],
                    lineHeight: 1.6,
                    fontSize: '0.72rem'
                  }}
                >
                  {task.result}
                </Typography>
              </Box>
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

  // Sort: processing first, then by timestamp desc
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
