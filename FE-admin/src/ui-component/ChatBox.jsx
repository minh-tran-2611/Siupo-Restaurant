import { useState, useRef, useEffect, useCallback } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Badge from '@mui/material/Badge';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Grow from '@mui/material/Grow';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// icons
import {
  IconMessageCircle,
  IconSend,
  IconX,
  IconRobot,
  IconUser,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconPaperclip,
  IconFile,
  IconPhoto,
  IconUpload,
  IconDownload,
  IconFileText
} from '@tabler/icons-react';

// project imports
import chatApi from 'api/chatApi';
import fileApi from 'api/fileApi';
import { drawerWidth } from 'store/constant';
import { useGetMenuMaster } from 'api/menu';

// ==============================|| AI CHATBOX ||============================== //

const ATTACHMENT_ACCEPT = '.md,.txt,.pdf,.docx,.json,.csv,.jpg,.jpeg,.png,.gif,.webp';
const MAX_ATTACHMENTS = 5;

// Layout constants
const HEADER_HEIGHT = 88;
const FAB_SIZE = 56;
const FAB_MARGIN = 24;
const COMPACT_WIDTH = 400;
const COMPACT_HEIGHT = 540;
const COMPACT_GAP = 16; // gap between FAB and chat window

function attachmentIcon(mime = '') {
  return mime.startsWith('image/') ? IconPhoto : IconFile;
}

function shortName(name, max = 24) {
  if (!name || name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot) : '';
  const base = dot > -1 ? name.slice(0, dot) : name;
  return base.slice(0, max - ext.length - 1) + '…' + ext;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtLabel(ext) {
  const map = {
    md: 'Markdown',
    pdf: 'PDF',
    docx: 'DOCX',
    txt: 'Text',
    csv: 'CSV',
    json: 'JSON',
    xlsx: 'Excel',
  };
  return map[ext?.toLowerCase()] || (ext ? ext.toUpperCase() : 'File');
}

export default function ChatBox() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const id = user?.id || user?._id || 'anonymous';
      return String(id);
    } catch {
      return 'anonymous';
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNewMessage(false);
    } else {
      // Reset expanded when closing
      setExpanded(false);
    }
  }, [open]);

  // Ctrl+Shift+S to open file picker (only when chat is open)
  useEffect(() => {
    const handler = (e) => {
      if (!open) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // ESC to close expanded mode, or close chat
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (expanded) {
          setExpanded(false);
        } else if (open) {
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, expanded]);

  // ── Attachment helpers ──────────────────────────────────────────────
  const readAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const idx = result.indexOf('base64,');
        resolve(idx >= 0 ? result.slice(idx + 7) : '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const processImage = useCallback(async (localId, file) => {
    try {
      const data = await readAsBase64(file);
      setAttachments((prev) =>
        prev.map((a) => (a.localId === localId ? { ...a, status: 'done', data } : a))
      );
    } catch (e) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId ? { ...a, status: 'error', error: e?.message || 'Read failed' } : a
        )
      );
    }
  }, []);

  const uploadDocument = useCallback(async (localId, file) => {
    try {
      const res = await fileApi.uploadFile({ file, description: 'Đính kèm từ chat' });
      setAttachments((prev) =>
        prev.map((a) => (a.localId === localId ? { ...a, status: 'done', remote: res.file } : a))
      );
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Upload failed';
      setAttachments((prev) =>
        prev.map((a) => (a.localId === localId ? { ...a, status: 'error', error: msg } : a))
      );
    }
  }, []);

  const handleAddFiles = useCallback(
    (files) => {
      if (!files || !files.length) return;
      const remainingSlots = MAX_ATTACHMENTS - attachments.length;
      const toAdd = Array.from(files).slice(0, remainingSlots);

      toAdd.forEach((file) => {
        const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const isImage = (file.type || '').startsWith('image/');
        const item = {
          localId,
          file,
          name: file.name,
          mime: file.type,
          size: file.size,
          kind: isImage ? 'image' : 'doc',
          status: 'uploading'
        };
        setAttachments((prev) => [...prev, item]);
        if (isImage) {
          processImage(localId, file);
        } else {
          uploadDocument(localId, file);
        }
      });
    },
    [attachments.length, processImage, uploadDocument]
  );

  const removeAttachment = (localId) => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  // ── Drag & drop on chat window ──────────────────────────────────────
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounter.current += 1;
      setIsDragging(true);
    }
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // ── Paste image from clipboard ───────────────────────────────────────
  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imgs.push(file);
      }
    }
    if (imgs.length) {
      e.preventDefault();
      handleAddFiles(imgs);
    }
  };

  // ── Send ─────────────────────────────────────────────────────────────
  const buildMessageWithDocs = (text, readyDocs) => {
    if (!readyDocs.length) return text;
    const lines = readyDocs.map((a) => `- ${a.remote?.filename || a.name}`).join('\n');
    return `[Đính kèm:\n${lines}\n]\n\n${text}`;
  };

  const handleToggle = () => setOpen((prev) => !prev);
  const handleClose = () => setOpen(false);
  const handleToggleExpand = () => setExpanded((prev) => !prev);

  const handleSend = async () => {
    const trimmed = input.trim();
    const ready = attachments.filter((a) => a.status === 'done');
    const stillUploading = attachments.some((a) => a.status === 'uploading');

    if (stillUploading) return;
    if (!trimmed && !ready.length) return;
    if (loading) return;

    const readyDocs = ready.filter((a) => a.kind === 'doc');
    const readyImages = ready.filter((a) => a.kind === 'image');

    const baseText = trimmed || 'Hãy phân tích / tư vấn dựa trên file đính kèm.';
    const finalMessage = buildMessageWithDocs(baseText, readyDocs);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmed,
      attachments: ready.map((a) => ({
        name: a.remote?.filename || a.name,
        mime: a.mime,
        kind: a.kind,
        dataUrl: a.kind === 'image' && a.data ? `data:${a.mime};base64,${a.data}` : null
      })),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage({
        userId: getUserId(),
        message: finalMessage,
        images: readyImages.map((a) => ({ data: a.data, mime: a.mime }))
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: res.reply,
        files: res.files || [],
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (!open) setHasNewMessage(true);
    } catch (error) {
      const errorDetail = error.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'ai',
          content: `Xin lỗi, ${typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)}`,
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setAttachments([]);
    try {
      await chatApi.clearHistory(getUserId());
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const sendDisabled =
    loading ||
    attachments.some((a) => a.status === 'uploading') ||
    (!input.trim() && !attachments.some((a) => a.status === 'done'));

  // ── Compute positions for compact vs expanded ────────────────────────
  // Sidebar offset for expanded mode
  const sidebarOffset = downMD ? 0 : (drawerOpen ? drawerWidth : 72);

  // Compact: position right above the FAB
  const compactSx = {
    position: 'fixed',
    bottom: FAB_MARGIN + FAB_SIZE + COMPACT_GAP,
    right: FAB_MARGIN,
    width: { xs: 'calc(100vw - 32px)', sm: COMPACT_WIDTH },
    height: { xs: 'calc(100vh - 140px)', sm: COMPACT_HEIGHT },
    maxHeight: '85vh',
    borderRadius: 3,
  };

  // Expanded: fill the main content area (beside sidebar, below header)
  const expandedSx = {
    position: 'fixed',
    top: HEADER_HEIGHT,
    bottom: 0,
    right: 0,
    left: sidebarOffset,
    width: 'auto',
    height: 'auto',
    maxHeight: 'none',
    borderRadius: 0,
  };

  const chatWindowSx = expanded ? expandedSx : compactSx;

  return (
    <>
      {/* Chat Window */}
      {open && (
        <Paper
          elevation={expanded ? 0 : 16}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          sx={{
            ...chatWindowSx,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: expanded ? 1400 : 1300,
            border: expanded
              ? `1px solid ${alpha(theme.palette.divider, 0.12)}`
              : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: expanded ? 'none' : 'chatSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes chatSlideUp': {
              '0%': {
                opacity: 0,
                transform: 'translateY(20px) scale(0.95)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0) scale(1)',
              },
            },
          }}
        >
          {/* Drag overlay */}
          {isDragging && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: alpha(theme.palette.primary.main, 0.92),
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
                border: `2px dashed ${alpha('#fff', 0.6)}`,
                m: 0.5,
                borderRadius: expanded ? 0 : 2.5
              }}
            >
              <IconUpload size={48} />
              <Typography variant="h5" sx={{ color: '#fff', mt: 1.5 }}>
                Thả file để đính kèm
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.85), mt: 0.5 }}>
                .md .txt .pdf .docx .png .jpg — tối đa {MAX_ATTACHMENTS} file
              </Typography>
            </Box>
          )}

          {/* Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: '#fff',
              px: expanded ? 3 : 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minHeight: expanded ? 64 : 60,
              transition: 'all 0.3s ease',
            }}
          >
            <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 36, height: 36 }}>
              <IconRobot size={22} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                AI Assistant
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.8) }}>
                {loading ? 'Đang nhập...' : 'Trực tuyến · Ctrl+Shift+S để đính kèm'}
              </Typography>
            </Box>
            <Tooltip title={expanded ? 'Thu nhỏ' : 'Mở rộng'}>
              <IconButton
                size="small"
                sx={{
                  color: '#fff',
                  '&:hover': { bgcolor: alpha('#fff', 0.15) },
                  transition: 'transform 0.3s ease',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                onClick={handleToggleExpand}
              >
                {expanded ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
              </IconButton>
            </Tooltip>
            <IconButton size="small" sx={{ color: '#fff', '&:hover': { bgcolor: alpha('#fff', 0.15) } }} onClick={handleClose}>
              <IconX size={18} />
            </IconButton>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: expanded ? 3 : 2,
              bgcolor: theme.palette.grey[50],
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              transition: 'padding 0.3s ease',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
                borderRadius: 3,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.4) }
              }
            }}
          >
            {messages.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 2,
                  py: 4
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    width: expanded ? 80 : 64,
                    height: expanded ? 80 : 64,
                    color: theme.palette.primary.main,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <IconRobot size={expanded ? 44 : 36} />
                </Avatar>
                <Box sx={{ textAlign: 'center', px: 2, maxWidth: expanded ? 600 : 'none' }}>
                  <Typography variant={expanded ? 'h4' : 'h5'} sx={{ color: theme.palette.grey[700], mb: 0.5, transition: 'all 0.3s ease' }}>
                    Xin chào!
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.grey[500], lineHeight: 1.6 }}>
                    Hỏi tôi về quản lý nhà hàng, hoặc kéo-thả file (CV, báo cáo, policy...) để xin tư vấn.
                  </Typography>
                </Box>
              </Box>
            )}

            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-end',
                  flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                  // In expanded mode, center the messages with max-width
                  ...(expanded && {
                    maxWidth: 800,
                    mx: 'auto',
                    width: '100%',
                  }),
                }}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: msg.type === 'user' ? theme.palette.secondary.main : theme.palette.primary.main,
                    flexShrink: 0
                  }}
                >
                  {msg.type === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}
                </Avatar>

                <Box
                  sx={{
                    maxWidth: expanded ? '70%' : '78%',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor:
                      msg.type === 'user'
                        ? theme.palette.primary.main
                        : msg.isError
                          ? alpha(theme.palette.error.main, 0.1)
                          : '#fff',
                    color:
                      msg.type === 'user' ? '#fff' : msg.isError ? theme.palette.error.main : theme.palette.grey[800],
                    boxShadow: msg.type === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                    borderBottomRightRadius: msg.type === 'user' ? 4 : undefined,
                    borderBottomLeftRadius: msg.type === 'ai' ? 4 : undefined
                  }}
                >
                  {/* Attachments inside user bubble */}
                  {msg.attachments?.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: msg.content ? 0.75 : 0 }}>
                      {/* Image thumbnails grid */}
                      {msg.attachments.some((att) => att.kind === 'image' && att.dataUrl) && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {msg.attachments
                            .filter((att) => att.kind === 'image' && att.dataUrl)
                            .map((att, idx) => (
                              <Box
                                key={`img-${idx}`}
                                sx={{
                                  position: 'relative',
                                  borderRadius: 1.5,
                                  overflow: 'hidden',
                                  width: expanded ? 160 : 120,
                                  height: expanded ? 120 : 90,
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                  border: `2px solid ${alpha('#fff', 0.25)}`,
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    border: `2px solid ${alpha('#fff', 0.5)}`,
                                    transform: 'scale(1.02)',
                                  },
                                  '&:hover .img-overlay': { opacity: 1 },
                                }}
                                onClick={() => window.open(att.dataUrl, '_blank')}
                              >
                                <Box
                                  component="img"
                                  src={att.dataUrl}
                                  alt={att.name}
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                <Box
                                  className="img-overlay"
                                  sx={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    px: 0.75, py: 0.5, bgcolor: alpha('#000', 0.55),
                                    opacity: 0, transition: 'opacity 0.2s ease',
                                  }}
                                >
                                  <Typography variant="caption" sx={{
                                    color: '#fff', fontSize: '0.65rem', display: 'block',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {shortName(att.name, 20)}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                        </Box>
                      )}
                      {/* Non-image attachments as text chips */}
                      {msg.attachments
                        .filter((att) => att.kind !== 'image' || !att.dataUrl)
                        .map((att, idx) => {
                          const Icon = attachmentIcon(att.mime);
                          return (
                            <Box key={`doc-${idx}`} sx={{
                              display: 'flex', alignItems: 'center', gap: 0.75,
                              px: 0.75, py: 0.5, borderRadius: 1, bgcolor: alpha('#fff', 0.18)
                            }}>
                              <Icon size={14} />
                              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#fff' }}>
                                {shortName(att.name, 28)}
                              </Typography>
                            </Box>
                          );
                        })}
                    </Box>
                  )}
                  {msg.content && (
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.6,
                        fontSize: expanded ? '0.9rem' : '0.85rem'
                      }}
                    >
                      {msg.content}
                    </Typography>
                  )}
                  {/* File download cards (Claude-style) */}
                  {msg.files?.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: msg.content ? 1.5 : 0 }}>
                      {msg.files.map((file) => (
                        <Box
                          key={file.file_id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                            bgcolor: alpha(theme.palette.grey[100], 0.6),
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                              borderColor: alpha(theme.palette.primary.main, 0.25),
                              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                            },
                          }}
                        >
                          {/* File icon */}
                          <Avatar
                            variant="rounded"
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              color: theme.palette.primary.main,
                              flexShrink: 0,
                            }}
                          >
                            <IconFileText size={22} />
                          </Avatar>
                          {/* File info */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: theme.palette.grey[800],
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.82rem',
                              }}
                            >
                              {file.filename}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: theme.palette.grey[500],
                                  fontSize: '0.7rem',
                                }}
                              >
                                Document · {getExtLabel(file.extension)}
                              </Typography>
                              {file.size_bytes > 0 && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: theme.palette.grey[400],
                                    fontSize: '0.68rem',
                                  }}
                                >
                                  · {formatFileSize(file.size_bytes)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          {/* Extension badge */}
                          <Chip
                            label={file.extension?.toUpperCase() || 'FILE'}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              border: 'none',
                              letterSpacing: 0.5,
                              flexShrink: 0,
                            }}
                          />
                          {/* Download button */}
                          <Tooltip title="Tải xuống" placement="top">
                            <IconButton
                              size="small"
                              component="a"
                              href={fileApi.getDownloadUrl(file.file_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                bgcolor: theme.palette.primary.main,
                                color: '#fff',
                                width: 34,
                                height: 34,
                                flexShrink: 0,
                                '&:hover': {
                                  bgcolor: theme.palette.primary.dark,
                                  transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <IconDownload size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: msg.type === 'user' ? 'right' : 'left',
                      mt: 0.3,
                      opacity: 0.6,
                      fontSize: '0.68rem'
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </Typography>
                </Box>
              </Box>
            ))}

            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-end',
                  ...(expanded && {
                    maxWidth: 800,
                    mx: 'auto',
                    width: '100%',
                  }),
                }}
              >
                <Avatar sx={{ width: 28, height: 28, bgcolor: theme.palette.primary.main, flexShrink: 0 }}>
                  <IconRobot size={16} />
                </Avatar>
                <Box
                  sx={{
                    px: 2,
                    py: 1.2,
                    borderRadius: 2,
                    bgcolor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex',
                    gap: 0.5,
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.4 }}>
                    {[0, 1, 2].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.primary.main, 0.5),
                          animation: 'chatBounce 1.4s infinite ease-in-out both',
                          animationDelay: `${i * 0.16}s`,
                          '@keyframes chatBounce': {
                            '0%, 80%, 100%': { transform: 'scale(0.6)' },
                            '40%': { transform: 'scale(1)' }
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <Box
              sx={{
                px: expanded ? 3 : 1.25,
                pt: 1,
                pb: 0.5,
                bgcolor: '#fff',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                transition: 'padding 0.3s ease',
                ...(expanded && {
                  maxWidth: 856,
                  mx: 'auto',
                  width: '100%',
                  boxSizing: 'border-box',
                }),
              }}
            >
              {attachments.map((a) => {
                const Icon = attachmentIcon(a.mime);
                const colorMap = {
                  uploading: theme.palette.info.main,
                  done: theme.palette.success.main,
                  error: theme.palette.error.main
                };
                const c = colorMap[a.status];

                // Image thumbnail preview
                if (a.kind === 'image') {
                  return (
                    <Tooltip
                      key={a.localId}
                      title={
                        a.status === 'error'
                          ? a.error
                          : a.status === 'uploading'
                            ? 'Đang xử lý...'
                            : `${shortName(a.name, 20)} · ${(a.size / 1024).toFixed(1)} KB`
                      }
                      arrow
                    >
                      <Box sx={{ position: 'relative', display: 'inline-block' }}>
                        {a.status === 'done' && a.data ? (
                          <Box
                            component="img"
                            src={`data:${a.mime};base64,${a.data}`}
                            alt={a.name}
                            sx={{
                              width: 56,
                              height: 56,
                              objectFit: 'cover',
                              borderRadius: 1.5,
                              display: 'block',
                              border: `2px solid ${theme.palette.success.light}`
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 1.5,
                              bgcolor: theme.palette.grey[200],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `2px solid ${alpha(c, 0.4)}`
                            }}
                          >
                            {a.status === 'uploading' ? (
                              <CircularProgress size={20} sx={{ color: c }} />
                            ) : (
                              <Icon size={22} color={c} />
                            )}
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => removeAttachment(a.localId)}
                          sx={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            bgcolor: theme.palette.grey[700],
                            color: '#fff',
                            p: 0,
                            '&:hover': { bgcolor: theme.palette.error.main }
                          }}
                        >
                          <IconX size={10} />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  );
                }

                // Document chip (unchanged)
                return (
                  <Tooltip
                    key={a.localId}
                    title={
                      a.status === 'error'
                        ? a.error
                        : a.status === 'uploading'
                          ? 'Đang upload...'
                          : `${(a.size / 1024).toFixed(1)} KB`
                    }
                    arrow
                  >
                    <Chip
                      icon={
                        a.status === 'uploading' ? (
                          <CircularProgress size={12} sx={{ color: c }} />
                        ) : (
                          <Icon size={14} color={c} />
                        )
                      }
                      label={shortName(a.name, 22)}
                      size="small"
                      onDelete={() => removeAttachment(a.localId)}
                      deleteIcon={<IconX size={12} />}
                      sx={{
                        height: 26,
                        fontSize: '0.7rem',
                        bgcolor: alpha(c, 0.08),
                        color: c,
                        border: `1px solid ${alpha(c, 0.3)}`,
                        '& .MuiChip-deleteIcon': {
                          color: c,
                          '&:hover': { color: theme.palette.error.dark }
                        }
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          )}

          {/* Upload progress bar */}
          {attachments.some((a) => a.status === 'uploading') && (
            <LinearProgress sx={{ height: 2 }} />
          )}

          {/* Input Area */}
          <Box
            sx={{
              p: expanded ? 2 : 1.5,
              bgcolor: '#fff',
              display: 'flex',
              gap: 0.5,
              alignItems: 'flex-end',
              transition: 'padding 0.3s ease',
              ...(expanded && {
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }),
            }}
          >
            {/* In expanded mode, center the input area */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                alignItems: 'flex-end',
                width: '100%',
                ...(expanded && {
                  maxWidth: 800,
                  mx: 'auto',
                }),
              }}
            >
              <Tooltip title={`Đính kèm file (Ctrl+Shift+S)`} placement="top">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || attachments.length >= MAX_ATTACHMENTS}
                    sx={{ color: theme.palette.grey[600] }}
                  >
                    <IconPaperclip size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={expanded ? 6 : 3}
                placeholder="Nhập tin nhắn... (Ctrl+V để dán ảnh, kéo-thả file)"
                variant="outlined"
                size="small"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={onPaste}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: expanded ? '0.95rem' : '0.875rem',
                    bgcolor: theme.palette.grey[50],
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: 1.5
                    }
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSend}
                          disabled={sendDisabled}
                          sx={{
                            bgcolor: !sendDisabled ? theme.palette.primary.main : 'transparent',
                            color: !sendDisabled ? '#fff' : theme.palette.grey[400],
                            width: 32,
                            height: 32,
                            '&:hover': {
                              bgcolor: !sendDisabled ? theme.palette.primary.dark : 'transparent'
                            },
                            '&.Mui-disabled': { color: theme.palette.grey[300] },
                            transition: 'all 0.2s'
                          }}
                        >
                          {loading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <IconSend size={16} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Box>
          </Box>

          {/* File type chips footer — only in expanded mode */}
          {expanded && (
            <Box
              sx={{
                px: 3,
                pb: 1.5,
                pt: 0,
                bgcolor: '#fff',
                display: 'flex',
                justifyContent: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'All', count: attachments.length || null },
                { label: 'Docs' },
                { label: 'Images' },
                { label: 'Data' },
                { label: 'Other' },
              ].map((item) => (
                <Chip
                  key={item.label}
                  label={item.count ? `${item.label} (${item.count})` : item.label}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    color: theme.palette.grey[600],
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Floating Action Button — hidden when expanded */}
      {!expanded && (
        <ClickAwayListener onClickAway={() => {}}>
          <Tooltip title={open ? '' : 'Chat với AI Assistant'} placement="left">
            <Fab
              color="primary"
              onClick={handleToggle}
              sx={{
                position: 'fixed',
                bottom: FAB_MARGIN,
                right: FAB_MARGIN,
                zIndex: 1300,
                width: FAB_SIZE,
                height: FAB_SIZE,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                background: open
                  ? theme.palette.grey[600]
                  : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: open
                    ? theme.palette.grey[700]
                    : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.5)}`
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Badge
                color="error"
                variant="dot"
                invisible={!hasNewMessage}
                sx={{ '& .MuiBadge-badge': { top: 4, right: 4 } }}
              >
                {open ? <IconX size={24} /> : <IconMessageCircle size={24} />}
              </Badge>
            </Fab>
          </Tooltip>
        </ClickAwayListener>
      )}
    </>
  );
}
