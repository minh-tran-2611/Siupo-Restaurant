import { useState, useRef } from 'react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useTheme, alpha } from '@mui/material/styles';

import C from 'assets/scss/_themes-vars.module.scss';
import fileApi from 'api/fileApi';

import {
  IconFile,
  IconFileText,
  IconPhoto,
  IconDatabase,
  IconUpload,
  IconDownload,
  IconTrash,
  IconRefresh,
  IconInbox,
  IconCheck,
  IconX
} from '@tabler/icons-react';

// ==============================|| FILE MANAGER ||============================== //

const FILE_TYPES = {
  document: { icon: IconFileText, color: C.primaryMain, label: 'Document' },
  image: { icon: IconPhoto, color: C.secondaryMain, label: 'Image' },
  data: { icon: IconDatabase, color: C.primary200, label: 'Data' },
  other: { icon: IconFile, color: C.grey500, label: 'File' }
};

const ACCEPT = '.md,.txt,.pdf,.docx,.json,.csv,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip';

function formatBytes(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(s) {
  if (!s) return '';
  const d = new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function FileItem({ file, onDelete }) {
  const theme = useTheme();
  const fileType = FILE_TYPES[file.file_type] || FILE_TYPES.other;
  const FileIcon = fileType.icon;

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5, maxWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.75rem' }}>
            {file.filename}
          </Typography>
          {file.description && (
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, lineHeight: 1.5 }}>
              {file.description}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
            {formatDate(file.created_at)} · {formatBytes(file.size_bytes)}
          </Typography>
          {file.indexed && (
            <Typography variant="caption" sx={{ color: C.success200, display: 'block', mt: 0.25 }}>
              Indexed: {file.chunk_count} chunks
            </Typography>
          )}
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
          border: `1px solid transparent`,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: alpha(fileType.color, 0.04),
            borderColor: alpha(fileType.color, 0.15),
            '& .file-actions': { opacity: 1 }
          }
        }}
      >
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
            {file.filename}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: theme.palette.grey[400], fontSize: '0.65rem' }}>
              {formatBytes(file.size_bytes)}
            </Typography>
            <Chip
              label={file.indexed ? `RAG · ${file.chunk_count}` : (file.extension || 'file').toUpperCase()}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.58rem',
                bgcolor: file.indexed ? alpha(C.success200 || theme.palette.success.main, 0.15) : alpha(theme.palette.grey[400], 0.15),
                color: file.indexed ? (C.successDark || theme.palette.success.dark) : theme.palette.grey[600],
                '& .MuiChip-label': { px: 0.75 }
              }}
            />
          </Box>
        </Box>

        <Box className="file-actions" sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.2s' }}>
          <Tooltip title="Tải về" arrow>
            <IconButton
              size="small"
              sx={{ width: 24, height: 24 }}
              component="a"
              href={fileApi.getDownloadUrl(file.id)}
              download={file.filename}
            >
              <IconDownload size={13} color={theme.palette.grey[600]} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa" arrow>
            <IconButton
              size="small"
              sx={{ width: 24, height: 24 }}
              onClick={() => onDelete(file)}
            >
              <IconTrash size={13} color={theme.palette.error.main} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Tooltip>
  );
}

function UploadDialog({ open, onClose, onUploaded }) {
  const fileInputRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setSelected(null);
    setDescription('');
    setError(null);
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fileApi.uploadFile({ file: selected, description });
      reset();
      onUploaded(result);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload file</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box
            sx={{
              border: `2px dashed ${alpha('#000', 0.15)}`,
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#000', 0.02) }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept={ACCEPT}
              onChange={(e) => setSelected(e.target.files?.[0] || null)}
            />
            <IconUpload size={28} style={{ opacity: 0.5 }} />
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
              {selected ? selected.name : 'Chọn file để upload'}
            </Typography>
            {selected && (
              <Typography variant="caption" color="text.secondary">
                {formatBytes(selected.size)}
              </Typography>
            )}
            {!selected && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Hỗ trợ .md, .txt, .pdf, .docx, .json, ảnh, zip — tối đa 25 MB
              </Typography>
            )}
          </Box>

          <TextField
            label="Mô tả (tùy chọn)"
            multiline
            rows={2}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Báo cáo doanh thu Q1, chính sách nhà hàng..."
            disabled={busy}
          />

          {busy && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!selected || busy} startIcon={<IconUpload size={16} />}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteDialog({ file, onClose, onConfirm, busy }) {
  return (
    <Dialog open={!!file} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Xóa file?</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Bạn có chắc muốn xóa <strong>{file?.filename}</strong>?
        </Typography>
        {file?.indexed && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
            File đã được index trong Qdrant ({file.chunk_count} chunks) — sẽ bị xóa khỏi RAG.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Hủy
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={14} /> : <IconTrash size={16} />}>
          Xóa
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FileManager({ hideHeader = false }) {
  const theme = useTheme();
  const [filter, setFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [snack, setSnack] = useState(null);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    ['files', filter],
    () => fileApi.listFiles({ fileType: filter === 'all' ? undefined : filter }),
    { revalidateOnFocus: false }
  );

  const files = data?.files || [];
  const counts = data?.counts || {};

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await fileApi.deleteFile(deleting.id);
      setSnack({ severity: 'success', message: 'Đã xóa file' });
      setDeleting(null);
      mutate();
    } catch (e) {
      setSnack({ severity: 'error', message: e?.response?.data?.detail || 'Xóa thất bại' });
    } finally {
      setDeleteBusy(false);
    }
  };

  const filterChips = [
    { key: 'all', label: `All (${counts.all || 0})` },
    { key: 'document', label: `Docs (${counts.document || 0})` },
    { key: 'image', label: `Images (${counts.image || 0})` },
    { key: 'data', label: `Data (${counts.data || 0})` },
    { key: 'other', label: `Other (${counts.other || 0})` }
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header — ẩn khi dùng trong MainCard có title */}
      {!hideHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: '1rem', fontWeight: 600, color: theme.palette.grey[800] }}>
              File Manager
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.grey[500] }}>
              {counts.all || 0} files
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 1 }}>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => mutate()} disabled={isValidating}>
            {isValidating ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Upload file">
          <IconButton
            size="small"
            onClick={() => setUploadOpen(true)}
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

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
        {filterChips.map((f) => (
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
          minHeight: 0,
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
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && !isLoading && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="error">
              Không tải được danh sách file
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {error?.message}
            </Typography>
          </Box>
        )}

        {!isLoading && !error && files.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 4, color: theme.palette.grey[400] }}>
            <IconInbox size={36} stroke={1.5} />
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.78rem' }}>
              Chưa có file nào
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>
              Click upload để thêm file đầu tiên
            </Typography>
          </Box>
        )}

        {!isLoading &&
          !error &&
          files.map((file) => <FileItem key={file.id} file={file} onDelete={setDeleting} />)}
      </Box>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(result) => {
          mutate();
          const indexErr = result?.file?.index_error;
          if (indexErr) {
            setSnack({ severity: 'warning', message: `Upload OK nhưng index Qdrant lỗi: ${indexErr}` });
          } else if (result?.file?.indexed) {
            setSnack({ severity: 'success', message: `Đã index ${result.file.chunk_count} chunks vào Qdrant` });
          } else {
            setSnack({ severity: 'success', message: 'Upload thành công (không index)' });
          }
        }}
      />

      <DeleteDialog
        file={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snack ? (
          <Alert
            severity={snack.severity}
            onClose={() => setSnack(null)}
            iconMapping={{ success: <IconCheck size={18} />, error: <IconX size={18} /> }}
            sx={{ width: '100%' }}
          >
            {snack.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}
