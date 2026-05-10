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

// icons
import {
  IconMessageCircle,
  IconSend,
  IconX,
  IconRobot,
  IconUser,
  IconSparkles,
  IconPaperclip,
  IconFile,
  IconPhoto,
  IconUpload
} from '@tabler/icons-react';

// project imports
import chatApi from 'api/chatApi';
import fileApi from 'api/fileApi';

// ==============================|| AI CHATBOX ||============================== //

const ATTACHMENT_ACCEPT = '.md,.txt,.pdf,.docx,.json,.csv,.jpg,.jpeg,.png,.gif,.webp';
const MAX_ATTACHMENTS = 5;

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

export default function ChatBox() {
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Attachments:
  //   { localId, file, name, mime, size, kind: 'image'|'doc',
  //     status: 'uploading'|'done'|'error',
  //     remote?  (doc only — server file metadata),
  //     data?    (image only — base64 string),
  //     error? }
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

  // ── Attachment helpers ──────────────────────────────────────────────
  // Images: read as base64 inline, kept in cache for the session only.
  // Documents: uploaded to /files endpoint (Qdrant-indexed).
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
  // Documents: prefix filenames into the message text (agent sees them via RAG).
  // Images: passed inline as base64 — kept session-only on the server.
  const buildMessageWithDocs = (text, readyDocs) => {
    if (!readyDocs.length) return text;
    const lines = readyDocs.map((a) => `- ${a.remote?.filename || a.name}`).join('\n');
    return `[Đính kèm:\n${lines}\n]\n\n${text}`;
  };

  const handleToggle = () => setOpen((prev) => !prev);
  const handleClose = () => setOpen(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    const ready = attachments.filter((a) => a.status === 'done');
    const stillUploading = attachments.some((a) => a.status === 'uploading');

    if (stillUploading) return; // wait for uploads
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
      attachments: ready.map((a) => ({ name: a.remote?.filename || a.name, mime: a.mime })),
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

  return (
    <>
      {/* Chat Window */}
      <Grow in={open} style={{ transformOrigin: 'bottom right' }}>
        <Paper
          elevation={16}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: { xs: 'calc(100vw - 32px)', sm: 400 },
            height: { xs: 'calc(100vh - 140px)', sm: 540 },
            maxHeight: '85vh',
            display: open ? 'flex' : 'none',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            zIndex: 1300,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
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
                borderRadius: 2.5
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
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minHeight: 60
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
            <Tooltip title="Cuộc hội thoại mới">
              <IconButton size="small" sx={{ color: '#fff', '&:hover': { bgcolor: alpha('#fff', 0.15) } }} onClick={handleNewChat}>
                <IconSparkles size={18} />
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
              p: 2,
              bgcolor: theme.palette.grey[50],
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
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
                    width: 64,
                    height: 64,
                    color: theme.palette.primary.main
                  }}
                >
                  <IconRobot size={36} />
                </Avatar>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography variant="h5" sx={{ color: theme.palette.grey[700], mb: 0.5 }}>
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
                  flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
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
                    maxWidth: '78%',
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: msg.content ? 0.75 : 0 }}>
                      {msg.attachments.map((att, idx) => {
                        const Icon = attachmentIcon(att.mime);
                        return (
                          <Box
                            key={idx}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              px: 0.75,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: alpha('#fff', 0.18)
                            }}
                          >
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
                        fontSize: '0.85rem'
                      }}
                    >
                      {msg.content}
                    </Typography>
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
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
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
                px: 1.25,
                pt: 1,
                pb: 0.5,
                bgcolor: '#fff',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5
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

          {/* Upload progress bar (visible while any uploading) */}
          {attachments.some((a) => a.status === 'uploading') && (
            <LinearProgress sx={{ height: 2 }} />
          )}

          {/* Input Area */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: '#fff',
              display: 'flex',
              gap: 0.5,
              alignItems: 'flex-end'
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
              maxRows={3}
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
                  fontSize: '0.875rem',
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
        </Paper>
      </Grow>

      {/* Floating Action Button */}
      <ClickAwayListener onClickAway={() => {}}>
        <Tooltip title={open ? '' : 'Chat với AI Assistant'} placement="left">
          <Fab
            color="primary"
            onClick={handleToggle}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1300,
              width: 56,
              height: 56,
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
    </>
  );
}
