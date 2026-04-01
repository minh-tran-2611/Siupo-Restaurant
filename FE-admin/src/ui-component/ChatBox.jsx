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
import Grow from '@mui/material/Grow';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';

// icons
import { IconMessageCircle, IconSend, IconX, IconRobot, IconUser, IconSparkles } from '@tabler/icons-react';

// project imports
import chatApi from 'api/chatApi';

// ==============================|| AI CHATBOX ||============================== //

export default function ChatBox() {
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get userId from localStorage
  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const id = user?.id || user?._id || 'anonymous';
      return String(id);
    } catch {
      return 'anonymous';
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNewMessage(false);
    }
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmed,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const payload = {
        userId: getUserId(),
        message: trimmed
      };
      console.log('Sending chat payload:', payload);
      const res = await chatApi.sendMessage(payload);

      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: res.reply,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (!open) {
        setHasNewMessage(true);
      }
    } catch (error) {
      console.error('Chat error:', error.response?.data || error.message);
      const errorDetail = error.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Xin lỗi, ${typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    // Clear conversation history on backend
    try {
      await chatApi.clearHistory(getUserId());
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Chat Window */}
      <Grow in={open} style={{ transformOrigin: 'bottom right' }}>
        <Paper
          elevation={16}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: { xs: 'calc(100vw - 32px)', sm: 400 },
            height: { xs: 'calc(100vh - 140px)', sm: 520 },
            maxHeight: '80vh',
            display: open ? 'flex' : 'none',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            zIndex: 1300,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
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
            <Avatar
              sx={{
                bgcolor: alpha('#fff', 0.2),
                width: 36,
                height: 36
              }}
            >
              <IconRobot size={22} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                AI Assistant
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.8) }}>
                {loading ? 'Đang nhập...' : 'Trực tuyến'}
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
              '&::-webkit-scrollbar': {
                width: 6
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'transparent'
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
                borderRadius: 3,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.4)
                }
              }
            }}
          >
            {/* Welcome message */}
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
                    Tôi là trợ lý AI của hệ thống. Hãy hỏi tôi bất cứ điều gì về quản lý nhà hàng, đơn hàng, sản phẩm...
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Message Bubbles */}
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
                {/* Avatar */}
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

                {/* Bubble */}
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
                      msg.type === 'user'
                        ? '#fff'
                        : msg.isError
                          ? theme.palette.error.main
                          : theme.palette.grey[800],
                    boxShadow: msg.type === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                    borderBottomRightRadius: msg.type === 'user' ? 4 : undefined,
                    borderBottomLeftRadius: msg.type === 'ai' ? 4 : undefined
                  }}
                >
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

            {/* Typing indicator */}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: theme.palette.primary.main,
                    flexShrink: 0
                  }}
                >
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

          {/* Input Area */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: '#fff',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end'
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={3}
              placeholder="Nhập tin nhắn..."
              variant="outlined"
              size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
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
                        disabled={!input.trim() || loading}
                        sx={{
                          bgcolor: input.trim() ? theme.palette.primary.main : 'transparent',
                          color: input.trim() ? '#fff' : theme.palette.grey[400],
                          width: 32,
                          height: 32,
                          '&:hover': {
                            bgcolor: input.trim() ? theme.palette.primary.dark : 'transparent'
                          },
                          '&.Mui-disabled': {
                            color: theme.palette.grey[300]
                          },
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
              sx={{
                '& .MuiBadge-badge': {
                  top: 4,
                  right: 4
                }
              }}
            >
              {open ? <IconX size={24} /> : <IconMessageCircle size={24} />}
            </Badge>
          </Fab>
        </Tooltip>
      </ClickAwayListener>
    </>
  );
}
