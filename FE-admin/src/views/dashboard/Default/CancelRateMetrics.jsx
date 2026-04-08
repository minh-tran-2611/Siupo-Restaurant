import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MainCard from 'ui-component/cards/MainCard';
import CancelIcon from '@mui/icons-material/Cancel';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import analyticsApi from '../../../api/analyticsApi';

// Component thống kê tỉ lệ hủy đơn
export default function CancelRateMetrics() {
  const [orderData, setOrderData] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [orderRes, bookingRes] = await Promise.all([
          analyticsApi.getOrders('THIS_MONTH'),
          analyticsApi.getBookings('THIS_MONTH')
        ]);
        
        if (orderRes && orderRes.data) {
          setOrderData(orderRes.data);
        }
        
        if (bookingRes && bookingRes.data) {
          setBookingData(bookingRes.data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !orderData || !bookingData) {
    return (
      <MainCard>
        <Typography>Loading...</Typography>
      </MainCard>
    );
  }

  return (
    <>
      {/* Order Cancel Rate */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CancelIcon sx={{ color: '#d32f2f' }} />
            <Typography variant="subtitle2" color="text.secondary">
              Order Cancel Rate
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#d32f2f' }}>
            {orderData.cancelRate ? orderData.cancelRate.toFixed(1) : 0}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {orderData.canceledOrders}/{orderData.totalOrders} orders canceled
          </Typography>
        </MainCard>
      </Grid>

      {/* No-show Rate */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <EventBusyIcon sx={{ color: '#f57c00' }} />
            <Typography variant="subtitle2" color="text.secondary">
              No-show Rate
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#f57c00' }}>
            {bookingData.noShowRate ? bookingData.noShowRate.toFixed(1) : 0}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            No-shows tracked
          </Typography>
        </MainCard>
      </Grid>

      {/* Total Bookings */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CancelIcon sx={{ color: '#e91e63' }} />
            <Typography variant="subtitle2" color="text.secondary">
              Total Bookings
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#e91e63' }}>
            {bookingData.totalBookings || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {bookingData.confirmedBookings || 0} confirmed
          </Typography>
        </MainCard>
      </Grid>
    </>
  );
}
