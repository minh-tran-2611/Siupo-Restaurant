import axiosClient from '../utils/axiosClient';

const analyticsApi = {
  /**
   * Get comprehensive analytics summary
   * @param {string} period - Period filter (TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM)
   * @param {object} customDates - Optional custom date range { startDate, endDate }
   */
  getSummary: (period = 'THIS_MONTH', customDates = null) => {
    const params = { period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/summary', { params }).then((res) => res.data);
  },

  /**
   * Get revenue analytics
   */
  getRevenue: (period = 'THIS_MONTH', customDates = null) => {
    const params = { period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/revenue', { params }).then((res) => res.data);
  },

  /**
   * Get order analytics
   */
  getOrders: (period = 'THIS_MONTH', customDates = null) => {
    const params = { period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/orders', { params }).then((res) => res.data);
  },

  /**
   * Get product analytics with top selling products
   */
  getProducts: (limit = 10, period = 'THIS_MONTH', customDates = null) => {
    const params = { limit, period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/products', { params }).then((res) => res.data);
  },

  /**
   * Get top selling products (shortcut)
   */
  getTopProducts: (limit = 10, period = 'THIS_MONTH', customDates = null) => {
    const params = { limit, period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/products/top-selling', { params }).then((res) => res.data);
  },

  /**
   * Get customer analytics
   */
  getCustomers: (period = 'THIS_MONTH', customDates = null) => {
    const params = { period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/customers', { params }).then((res) => res.data);
  },

  /**
   * Get booking analytics
   */
  getBookings: (period = 'THIS_MONTH', customDates = null) => {
    const params = { period };
    if (customDates?.startDate) params.startDate = customDates.startDate;
    if (customDates?.endDate) params.endDate = customDates.endDate;
    return axiosClient.get('/analytics/bookings', { params }).then((res) => res.data);
  },

  /**
   * Get AI-ready insights
   */
  getInsights: () => {
    return axiosClient.get('/analytics/insights').then((res) => res.data);
  }
};

export default analyticsApi;
