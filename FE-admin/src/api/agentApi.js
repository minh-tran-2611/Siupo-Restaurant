import axios from 'axios';
import { AI_AGENT_BASE_URL } from '../config';

const aiAgentClient = axios.create({
  baseURL: AI_AGENT_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false
});

const agentApi = {
  /**
   * Lấy danh sách task gần đây cho Task Pipeline.
   * @param {Object} params - { limit, includeNonTask }
   * @returns {Promise<{ tasks: Array, count: number }>}
   */
  listTasks: ({ limit = 50, includeNonTask = false } = {}) =>
    aiAgentClient
      .get('/agents/tasks', {
        params: { limit, include_non_task: includeNonTask }
      })
      .then((res) => res.data),

  /**
   * Lấy chi tiết 1 task (bao gồm tool calls đầy đủ).
   */
  getTask: (taskId) => aiAgentClient.get(`/agents/tasks/${taskId}`).then((res) => res.data),

  /**
   * Snapshot trạng thái live của agent bus (active tasks/workers/jobs/invokes).
   * Dùng khi mount + khi reconnect SSE để reconcile state.
   * @returns {Promise<{ agent_invokes: Object, active_tasks: string[], active_workers: string[], active_jobs: string[], subscribers: number }>}
   */
  getAgentState: () => aiAgentClient.get('/agents/state').then((res) => res.data),

  /**
   * URL của SSE event stream (dùng trực tiếp với EventSource).
   */
  eventsUrl: () => `${AI_AGENT_BASE_URL.replace(/\/$/, '')}/agents/events`,

  /**
   * Chạy consolidate thủ công (nút trên node Consolidate trong sơ đồ).
   * Chạy đồng bộ, trả về khi hoàn tất.
   * @returns {Promise<{ status: string, message: string }>}
   */
  runConsolidate: () => aiAgentClient.post('/agents/consolidate/run').then((res) => res.data)
};

export default agentApi;
