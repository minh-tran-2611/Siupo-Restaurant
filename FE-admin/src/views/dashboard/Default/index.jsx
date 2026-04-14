import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import EarningCard from './EarningCard';
import TotalOrderLineChartCard from './TotalOrderLineChartCard';
import BookingStatsCard from './BookingStatsCard';
import TotalIncomeLightCard from '../../../ui-component/cards/TotalIncomeLightCard';
import analyticsApi from '../../../api/analyticsApi';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import MiniBookingCalendar from './MiniBookingCalendar';
import RevenueMetrics from './RevenueMetrics';
import CancelRateMetrics from './CancelRateMetrics';
import OrderStatusChart from './OrderStatusChart';
import TopSellingProducts from './TopSellingProducts';

import { gridSpacing } from 'store/constant';

// assets
import StorefrontTwoToneIcon from '@mui/icons-material/StorefrontTwoTone';

// ==============================|| DEFAULT DASHBOARD ||============================== //

export default function Dashboard() {
  const [isLoading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Use new Analytics API instead of fetching all orders
        const response = await analyticsApi.getRevenue('THIS_MONTH');
        if (response && response.data) {
          setTotalRevenue(response.data.totalRevenue || 0);
        }
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      }
    };

    fetchAnalytics();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <EarningCard isLoading={isLoading} />
          </Grid>
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <TotalOrderLineChartCard isLoading={isLoading} />
          </Grid>
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <BookingStatsCard isLoading={isLoading} />
          </Grid>
          <Grid size={{ lg: 4, md: 12, sm: 12, xs: 12 }}>
            <Grid container spacing={gridSpacing}>
              <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                <TotalIncomeLightCard
                  {...{
                    isLoading: isLoading,
                    total: totalRevenue,
                    label: 'Total Revenue',
                    icon: <StorefrontTwoToneIcon fontSize="inherit" />
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* Revenue & Cancel Rate Metrics - Thống kê doanh thu và tỉ lệ hủy */}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <RevenueMetrics />
          <CancelRateMetrics />
        </Grid>
      </Grid>
      {/* Charts Row - Biểu đồ */}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TotalGrowthBarChart isLoading={isLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <OrderStatusChart />
          </Grid>
        </Grid>
      </Grid>
      {/* Calendar & Top Selling Products */}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 8 }}>
            <MiniBookingCalendar isLoading={isLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TopSellingProducts />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
