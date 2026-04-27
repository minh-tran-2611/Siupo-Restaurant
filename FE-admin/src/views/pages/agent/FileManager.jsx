import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';

// design tokens — same source as palette.jsx
import C from 'assets/scss/_themes-vars.module.scss';

// icons
import {
  IconFile,
  IconFileText,
  IconPhoto,
  IconDatabase,
  IconUpload,
  IconDownload,
  IconTrash,
  IconChevronRight,
  IconSearch
} from '@tabler/icons-react';

// ==============================|| FILE MANAGER ||============================== //

const FILE_TYPES = {
  document: { icon: IconFileText, color: C.primaryMain, label: 'Document' },
  image: { icon: IconPhoto, color: C.secondaryMain, label: 'Image' },
  data: { icon: IconDatabase, color: C.primary200, label: 'Data' },
  other: { icon: IconFile, color: C.grey500, label: 'File' }
};

const MOCK_FILES = [
  {
    id: 1,
    name: 'menu_analysis_apr2026.md',
    type: 'document',
    size: '12.4 KB',
    source: 'agent',
    agent: 'Analytics Agent',
    agentIcon: '📊',
    createdAt: '25/04/2026 14:21',
    description: 'Báo cáo phân tích menu tháng 4/2026'
  },
  {
    id: 2,
    name: 'revenue_report_q1.md',
    type: 'document',
    size: '28.1 KB',
    source: 'agent',
    agent: 'Analytics Agent',
    agentIcon: '📊',
    createdAt: '20/04/2026 09:15',
    description: 'Báo cáo doanh thu quý 1/2026'
  },
  {
    id: 3,
    name: 'restaurant_policy.pdf',
    type: 'document',
    size: '156 KB',
    source: 'qdrant',
    agent: null,
    createdAt: '15/04/2026 10:30',
    description: 'Chính sách nhà hàng — đã upload vào Qdrant vector DB'
  },
  {
    id: 4,
    name: 'banner_home1.jpg',
    type: 'image',
    size: '245 KB',
    source: 'agent',
    agent: 'Management Agent',
    agentIcon: '⚙️',
    createdAt: '18/04/2026 11:00',
    description: 'Banner trang chủ do agent tìm và tải về'
  },
  {
    id: 5,
    name: 'training_data_faq.json',
    type: 'data',
    size: '89 KB',
    source: 'qdrant',
    agent: null,
    createdAt: '10/04/2026 15:45',
    description: 'Dữ liệu FAQ training cho RAG system'
  },
  {
    id: 6,
    name: 'product_images_batch.zip',
    type: 'other',
    size: '2.3 MB',
    source: 'qdrant',
    agent: null,
    createdAt: '08/04/2026 08:20',
    description: 'Batch upload ảnh sản phẩm'
  },
  {
    id: 7,
    name: 'customer_feedback_analysis.md',
    type: 'document',
    size: '18.7 KB',
    source: 'agent',
    agent: 'Analytics Agent',
    agentIcon: '📊',
    createdAt: '22/04/2026 16:30',
    description: 'Phân tích feedback khách hàng tuần 3 tháng 4'
  },
  {
    id: 8,
    name: 'combo_optimization.md',
    type: 'document',
    size: '9.2 KB',
    source: 'agent',
    agent: 'Analytics Agent',
    agentIcon: '📊',
    createdAt: '24/04/2026 11:10',
    description: 'Đề xuất tối ưu combo dựa trên dữ liệu bán hàng'
  }
];

function FileItem({ file }) {
  const theme = useTheme();
  const fileType = FILE_TYPES[file.type] || FILE_TYPES.other;
  const FileIcon = fileType.icon;

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5, maxWidth: 240 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.75rem' }}>
            {file.name}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, lineHeight: 1.5 }}>
            {file.description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {file.createdAt} · {file.size}
          </Typography>
        </Box>
      }
      placement="left"
      arrow
      enterDelay={300}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.25,
          borderRadius: 2,
          cursor: 'pointer',
          border: `1px solid transparent`,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: alpha(fileType.color, 0.04),
            borderColor: alpha(fileType.color, 0.15),
            '& .file-actions': { opacity: 1 }
          }
        }}
      >
        {/* File icon */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(fileType.color, 0.08),
            flexShrink: 0
          }}
        >
          <FileIcon size={18} color={fileType.color} />
        </Box>

        {/* File info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '0.78rem',
              color: theme.palette.grey[800],
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {file.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: theme.palette.grey[400], fontSize: '0.65rem' }}>
              {file.size}
            </Typography>
            <Chip
              label={file.source === 'agent' ? file.agentIcon + ' Agent' : '📦 Qdrant'}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.58rem',
                bgcolor: file.source === 'agent' ? alpha(C.secondaryMain, 0.1) : alpha(C.primary200, 0.12),
                color: file.source === 'agent' ? C.secondaryDark : C.primaryDark,
                '& .MuiChip-label': { px: 0.75 }
              }}
            />
          </Box>
        </Box>

        {/* Actions */}
        <Box className="file-actions" sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.2s' }}>
          <IconButton size="small" sx={{ width: 24, height: 24 }}>
            <IconDownload size={13} color={theme.palette.grey[500]} />
          </IconButton>
          <IconButton size="small" sx={{ width: 24, height: 24 }}>
            <IconTrash size={13} color={theme.palette.grey[400]} />
          </IconButton>
        </Box>
      </Box>
    </Tooltip>
  );
}

export default function FileManager({ hideHeader = false }) {
  const theme = useTheme();
  const [filter, setFilter] = useState('all');

  const filteredFiles =
    filter === 'all' ? MOCK_FILES : filter === 'agent' ? MOCK_FILES.filter((f) => f.source === 'agent') : MOCK_FILES.filter((f) => f.source === 'qdrant');

  const agentFileCount = MOCK_FILES.filter((f) => f.source === 'agent').length;
  const qdrantFileCount = MOCK_FILES.filter((f) => f.source === 'qdrant').length;

  // Storage calculation (mock)
  const totalStorage = 2.8;
  const usedStorage = 0.56;
  const storagePercent = (usedStorage / totalStorage) * 100;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header — ẩn khi dùng trong MainCard có title */}
      {!hideHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: '1rem', fontWeight: 600, color: theme.palette.grey[800] }}>
              File Manager
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.grey[500] }}>
              {agentFileCount} agent files · {qdrantFileCount} qdrant files
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Upload to Qdrant">
              <IconButton
                size="small"
                sx={{
                  color: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                }}
              >
                <IconUpload size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      {hideHeader && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Tooltip title="Upload to Qdrant">
            <IconButton
              size="small"
              sx={{
                color: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
              }}
            >
              <IconUpload size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Storage bar */}
      <Box sx={{ mb: 2, p: 1.25, borderRadius: 2, bgcolor: alpha(theme.palette.grey[100], 0.8) }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.grey[700], fontSize: '0.7rem' }}>
            Storage
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.grey[500], fontSize: '0.7rem' }}>
            {usedStorage} GB / {totalStorage} GB
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={storagePercent}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.grey[300], 0.3),
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
            }
          }}
        />
      </Box>

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5 }}>
        {[
          { key: 'all', label: `All (${MOCK_FILES.length})` },
          { key: 'agent', label: `Agent (${agentFileCount})` },
          { key: 'qdrant', label: `Qdrant (${qdrantFileCount})` }
        ].map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            size="small"
            onClick={() => setFilter(f.key)}
            sx={{
              height: 24,
              fontSize: '0.68rem',
              fontWeight: filter === f.key ? 600 : 400,
              bgcolor: filter === f.key ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.grey[200], 0.5),
              color: filter === f.key ? theme.palette.primary.dark : theme.palette.grey[600],
              border: filter === f.key ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : '1px solid transparent',
              cursor: 'pointer',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
            }}
          />
        ))}
      </Box>

      {/* File list */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
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
        {filteredFiles.map((file) => (
          <FileItem key={file.id} file={file} />
        ))}
      </Box>
    </Box>
  );
}
