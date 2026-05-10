import axios from 'axios';
import { AI_AGENT_BASE_URL } from '../config';

// Tạo axios instance riêng cho AI Agent Service (FastAPI)
const aiAgentClient = axios.create({
  baseURL: AI_AGENT_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false
});

const chatApi = {
  /**
   * Gửi tin nhắn đến AI Agent (FastAPI)
   * @param {Object} data
   * @param {string} data.userId
   * @param {string} data.message
   * @param {Array<{ data: string, mime: string }>} [data.images] - base64-encoded image attachments (session-only, không lưu DB)
   * @returns {Promise<{ reply: string }>}
   */
  sendMessage: (data) => aiAgentClient.post('/chat', data).then((res) => res.data),

  /**
   * Xóa lịch sử hội thoại (khi nhấn New Chat)
   * @param {string} userId
   * @returns {Promise<{ status: string, message: string }>}
   */
  clearHistory: (userId) => aiAgentClient.post('/chat/clear', { userId }).then((res) => res.data)
};

export default chatApi;
