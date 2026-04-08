import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MainCard from 'ui-component/cards/MainCard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import analyticsApi from '../../../api/analyticsApi';

// Component thống kê doanh thu chi tiết
export default function RevenueMetrics() {
  const [revenueData, setRevenueData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch revenue and order analytics from new API
        const [revenueRes, orderRes] = await Promise.all([
          analyticsApi.getRevenue('THIS_MONTH'),
          analyticsApi.getOrders('THIS_MONTH')
        ]);
        
        if (revenueRes && revenueRes.data) {
          setRevenueData(revenueRes.data);
        }
        
        if (orderRes && orderRes.data) {
          setOrderData(orderRes.data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !revenueData || !orderData) {
    return (
      <MainCard>
        <Typography>Loading...</Typography>
      </MainCard>
    );
  }

  // Calculate percent change from growth rate
  const percentChange = revenueData.growthRate || 0;
  const isIncrease = percentChange >= 0;

  return (
    <>
      {/* AOV Card */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AttachMoneyIcon color="primary" />
            <Typography variant="subtitle2" color="text.secondary">
              Average Order Value
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e88e5' }}>
            ${(revenueData.averageOrderValue / 25000).toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            AOV
          </Typography>
        </MainCard>
      </Grid>

      {/* Today vs Yesterday */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {isIncrease ? (
              <TrendingUpIcon sx={{ color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ color: 'error.main' }} />
            )}
            <Typography variant="subtitle2" color="text.secondary">
              Today's Revenue
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            ${(revenueData.todayRevenue / 25000).toFixed(2)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: isIncrease ? 'success.main' : 'error.main',
                fontWeight: 600
              }}
            >
              {isIncrease ? '+' : ''}
              {percentChange.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              vs yesterday
            </Typography>
          </Box>
        </MainCard>
      </Grid>

      {/* Peak Hour */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccessTimeIcon color="warning" />
            <Typography variant="subtitle2" color="text.secondary">
              Peak Hour
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#f57c00' }}>
            {orderData.peakHour ? `${orderData.peakHour.hour}:00 - ${orderData.peakHour.hour + 1}:00` : 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {orderData.peakHour ? `${orderData.peakHour.orderCount} orders` : ''}
          </Typography>
        </MainCard>
      </Grid>
    </>
  );
}
