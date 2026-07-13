import axiosClient from '../utils/axiosClient';

const reviewApi = {
  getAll: (params) => axiosClient.get('/admin/reviews', { params }).then((res) => res.data),
  getById: (id) => axiosClient.get(`/admin/reviews/${id}`).then((res) => res.data),
  getStatistics: () => axiosClient.get('/admin/reviews/statistics').then((res) => res.data),
  updateVisibility: (id, hidden) => axiosClient.patch(`/admin/reviews/${id}/visibility`, { hidden }).then((res) => res.data),
  delete: (id) => axiosClient.delete(`/admin/reviews/${id}`).then((res) => res.data)
};

export default reviewApi;
