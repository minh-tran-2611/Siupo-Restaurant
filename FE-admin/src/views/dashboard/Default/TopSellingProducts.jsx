import { useEffect, useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import analyticsApi from '../../../api/analyticsApi';

// Component hiển thị top món bán chạy
export default function TopSellingProducts() {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const res = await analyticsApi.getTopProducts(5, 'THIS_MONTH');
        if (res && res.data && Array.isArray(res.data)) {
          setTopProducts(res.data);
        }
      } catch (err) {
        console.error('Error fetching top selling products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopProducts();
  }, []);

  if (loading) {
    return (
      <MainCard>
        <Typography>Loading...</Typography>
      </MainCard>
    );
  }

  if (!topProducts || topProducts.length === 0) {
    return (
      <MainCard>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Top Selling Products
        </Typography>
        <Typography color="text.secondary">No product data available</Typography>
      </MainCard>
    );
  }

  return (
    <MainCard>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <TrendingUpIcon color="primary" />
        <Typography variant="h4">Top Selling Products</Typography>
      </Box>

      <Stack spacing={2}>
        {topProducts.map((product, index) => (
          <Stack
            key={product.productId}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              p: 2,
              bgcolor: index < 3 ? 'primary.lighter' : 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: index < 3 ? 'primary.light' : 'divider',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
                transform: 'translateY(-2px)'
              }
            }}
          >
            {/* Rank */}
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: index < 3 ? 'primary.main' : 'grey.300',
                color: index < 3 ? 'white' : 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px'
              }}
            >
              {index + 1}
            </Box>

            {/* Product Image */}
            <Avatar
              src={product.imageUrl}
              variant="rounded"
              sx={{
                width: 60,
                height: 60,
                border: '2px solid',
                borderColor: 'divider'
              }}
            />

            {/* Product Info */}
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {product.productName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Sold: {product.quantitySold}
                </Typography>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'divider' }} />
                <Typography variant="caption" color="primary.main" fontWeight={600}>
                  ${(product.revenue / 25000).toFixed(2)}
                </Typography>
              </Stack>
            </Box>

            {/* Quantity Sold */}
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label={`${product.quantitySold} sold`}
                color={index < 3 ? 'primary' : 'default'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    </MainCard>
  );
}
