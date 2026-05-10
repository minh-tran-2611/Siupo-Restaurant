import axios from 'axios';
import { AI_AGENT_BASE_URL } from '../config';

const aiAgentClient = axios.create({
  baseURL: AI_AGENT_BASE_URL,
  withCredentials: false
});

const fileApi = {
  /**
   * Lấy danh sách file đã upload.
   * @param {Object} params - { fileType, limit }
   * @returns {Promise<{ files: Array, counts: Object }>}
   */
  listFiles: ({ fileType, limit = 100 } = {}) =>
    aiAgentClient
      .get('/files', {
        params: { file_type: fileType, limit }
      })
      .then((res) => res.data),

  /**
   * Upload file (multipart). file: File object từ <input type="file"/>.
   */
  uploadFile: ({ file, description = '', uploadedBy = 'admin' }) => {
    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    if (uploadedBy) form.append('uploaded_by', uploadedBy);
    return aiAgentClient
      .post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then((res) => res.data);
  },

  /**
   * URL trực tiếp để tải file (gắn vào <a href>).
   */
  getDownloadUrl: (fileId) => `${AI_AGENT_BASE_URL}/files/${fileId}/download`,

  /**
   * Xóa file (FS + Turso + Qdrant chunks).
   */
  deleteFile: (fileId) => aiAgentClient.delete(`/files/${fileId}`).then((res) => res.data)
};

export default fileApi;
