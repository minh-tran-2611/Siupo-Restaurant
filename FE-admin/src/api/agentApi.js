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
   * Trigger crawl thủ công — chạy ngay crawl_agent_job mà không cần đợi schedule.
   * @returns {Promise<{ status: string, message: string }>}
   */
  triggerCrawl: () => aiAgentClient.post('/agents/crawl/run').then((res) => res.data),

  /**
   * Trạng thái lần crawl gần nhất (last_run, status, pages_crawled, chunks_indexed).
   * @returns {Promise<{ last_run: string|null, status: string, pages_crawled: number, chunks_indexed: number, next_run: string|null }>}
   */
  getCrawlStatus: () => aiAgentClient.get('/agents/crawl/status').then((res) => res.data),

  /**
   * Lấy danh sách URLs hiện tại mà crawl agent sẽ fetch.
   * @returns {Promise<{ urls: string[] }>}
   */
  getCrawlConfig: () => aiAgentClient.get('/agents/crawl/config').then((res) => res.data),

  /**
   * Lưu danh sách URLs mới cho crawl agent.
   * @param {string[]} urls
   * @returns {Promise<{ status: string, urls: string[], message: string }>}
   */
  saveCrawlConfig: (urls) => aiAgentClient.put('/agents/crawl/config', { urls }).then((res) => res.data),

  /**
   * Chạy consolidate thủ công (nút trên node Consolidate trong sơ đồ).
   * Chạy đồng bộ, trả về khi hoàn tất.
   * @returns {Promise<{ status: string, message: string }>}
   */
  runConsolidate: () => aiAgentClient.post('/agents/consolidate/run').then((res) => res.data)
};

export default agentApi;
