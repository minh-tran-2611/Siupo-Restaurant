import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from 'components/ConfirmDialog';
import { useSnackbar } from 'contexts/SnackbarProvider';
import reviewApi from 'api/reviewApi';
import ReviewDetailDialog from './ReviewDetailDialog';

const EMPTY_STATS = {
  totalReviews: 0,
  publishedReviews: 0,
  hiddenReviews: 0,
  lowRatingReviews: 0,
  averageRating: 0
};

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export default function ReviewManagement() {
  const { showSnackbar } = useSnackbar();
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [rating, setRating] = useState('');
  const [visibility, setVisibility] = useState('');
  const [orderId, setOrderId] = useState('');
  const [detailReview, setDetailReview] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: rowsPerPage, sort: 'createdAt,desc' };
      if (keyword) params.keyword = keyword;
      if (rating !== '') params.rating = rating;
      if (visibility !== '') params.hidden = visibility === 'hidden';
      if (orderId) params.orderId = orderId;

      const response = await reviewApi.getAll(params);
      const pageData = response?.data || {};
      setReviews(pageData.content || []);
      setTotalElements(pageData.totalElements || 0);
    } catch (error) {
      showSnackbar({ message: getErrorMessage(error, 'Could not load reviews. Try refreshing the page.'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [keyword, orderId, page, rating, rowsPerPage, showSnackbar, visibility]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await reviewApi.getStatistics();
      setStatistics(response?.data || EMPTY_STATS);
    } catch (error) {
      showSnackbar({ message: getErrorMessage(error, 'Could not load review statistics.'), severity: 'error' });
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const stats = useMemo(
    () => [
      { label: 'Total reviews', value: statistics.totalReviews, color: 'primary.main' },
      { label: 'Average rating', value: Number(statistics.averageRating || 0).toFixed(1), color: 'warning.dark', rating: true },
      { label: 'Published', value: statistics.publishedReviews, color: 'success.main' },
      { label: 'Needs attention', value: statistics.lowRatingReviews, color: 'error.main' }
    ],
    [statistics]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReviews(), fetchStatistics()]);
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchInput('');
    setKeyword('');
    setRating('');
    setVisibility('');
    setOrderId('');
    setPage(0);
  };

  const openVisibilityAction = (review) => {
    setPendingAction({ type: 'visibility', review });
  };

  const openDeleteAction = (review) => {
    setPendingAction({ type: 'delete', review });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    const { type, review } = pendingAction;
    try {
      if (type === 'delete') {
        await reviewApi.delete(review.id);
        showSnackbar({ message: 'Review deleted. The order item can be reviewed again.', severity: 'success' });
      } else {
        const nextHidden = !review.hidden;
        await reviewApi.updateVisibility(review.id, nextHidden);
        showSnackbar({ message: nextHidden ? 'Review hidden from customers.' : 'Review published for customers.', severity: 'success' });
      }
      setPendingAction(null);
      await Promise.all([fetchReviews(), fetchStatistics()]);
    } catch (error) {
      showSnackbar({ message: getErrorMessage(error, 'The review could not be updated.'), severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilters = Boolean(searchInput || rating !== '' || visibility !== '' || orderId);
  const actionIsDelete = pendingAction?.type === 'delete';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Review Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor customer feedback and control what appears on product pages
          </Typography>
        </Box>
        <Tooltip title="Refresh reviews">
          <span>
            <IconButton aria-label="Refresh reviews" color="primary" onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon
                sx={{
                  animation: refreshing ? 'review-spin 0.8s linear infinite' : 'none',
                  '@keyframes review-spin': { to: { transform: 'rotate(360deg)' } }
                }}
              />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {stat.label}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
                    {stat.value}
                  </Typography>
                  {stat.rating && <Rating value={Number(stat.value)} precision={0.1} readOnly size="small" />}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
            <TextField
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search customer, email, product, or feedback..."
              size="small"
              sx={{ flex: 1, minWidth: { md: 280 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Order ID"
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value.replace(/\D/g, ''));
                setPage(0);
              }}
              size="small"
              inputProps={{ inputMode: 'numeric', 'aria-label': 'Filter by order ID' }}
              sx={{ width: { xs: '100%', md: 130 } }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="rating-filter-label">Rating</InputLabel>
              <Select
                labelId="rating-filter-label"
                value={rating}
                label="Rating"
                onChange={(event) => {
                  setRating(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All ratings</MenuItem>
                {[5, 4, 3, 2, 1].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value} stars
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="visibility-filter-label">Visibility</InputLabel>
              <Select
                labelId="visibility-filter-label"
                value={visibility}
                label="Visibility"
                onChange={(event) => {
                  setVisibility(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All reviews</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="hidden">Hidden</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {hasFilters && (
            <Button size="small" startIcon={<FilterListIcon />} onClick={clearFilters} sx={{ mb: 1 }}>
              Clear filters
            </Button>
          )}

          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: 1, borderColor: 'divider' }}>
            <Table size="small" aria-label="Customer reviews">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Item & order</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rating</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>Feedback</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Loading customer feedback...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                      <Typography variant="h5" sx={{ mb: 0.5 }}>
                        No reviews found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {hasFilters
                          ? 'Try clearing a filter or using a broader search.'
                          : 'Customer reviews will appear here after completed orders.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id} hover sx={{ opacity: review.hidden ? 0.72 : 1 }}>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              bgcolor: 'primary.light',
                              color: 'primary.dark',
                              fontSize: '0.875rem',
                              fontWeight: 700
                            }}
                          >
                            {review.userName?.charAt(0)?.toUpperCase() || 'A'}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {review.userName || 'Anonymous'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 170 }}>
                              {review.userEmail || 'No email'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {review.itemType === 'COMBO' ? review.comboName || 'Deleted combo' : review.productName || 'Deleted product'}
                          </Typography>
                          {review.itemType === 'COMBO' && <Chip label="Combo" size="small" color="secondary" variant="outlined" />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Order #{review.orderId} · Item #{review.orderItemId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Rating value={review.rating || 0} precision={0.5} readOnly size="small" />
                          <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {Number(review.rating || 0).toFixed(1)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {review.content || 'Rating only'}
                        </Typography>
                        {review.imageUrls?.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {review.imageUrls.length} attachment{review.imageUrls.length > 1 ? 's' : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={review.hidden ? 'Hidden' : 'Published'}
                          color={review.hidden ? 'default' : 'success'}
                          variant={review.hidden ? 'outlined' : 'filled'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {formatDate(review.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          <Tooltip title="View details">
                            <IconButton
                              aria-label={`View review ${review.id}`}
                              size="small"
                              color="info"
                              onClick={() => setDetailReview(review)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={review.hidden ? 'Publish review' : 'Hide review'}>
                            <IconButton
                              aria-label={review.hidden ? `Publish review ${review.id}` : `Hide review ${review.id}`}
                              size="small"
                              color={review.hidden ? 'success' : 'warning'}
                              onClick={() => openVisibilityAction(review)}
                            >
                              {review.hidden ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete review">
                            <IconButton
                              aria-label={`Delete review ${review.id}`}
                              size="small"
                              color="error"
                              onClick={() => openDeleteAction(review)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalElements}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Rows per page:"
            />
          </TableContainer>
        </CardContent>
      </Card>

      <ReviewDetailDialog open={Boolean(detailReview)} review={detailReview} onClose={() => setDetailReview(null)} />
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={actionIsDelete ? 'Delete review?' : pendingAction?.review.hidden ? 'Publish review?' : 'Hide review?'}
        content={
          actionIsDelete
            ? 'This permanently deletes the review and allows the customer to review this order item again.'
            : pendingAction?.review.hidden
              ? 'This review will be visible again on the product page.'
              : 'This review will no longer appear publicly, but its data will be preserved.'
        }
        confirmText={actionIsDelete ? 'Delete review' : pendingAction?.review.hidden ? 'Publish review' : 'Hide review'}
        cancelText="Keep current status"
        loading={actionLoading}
        onClose={() => !actionLoading && setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </Box>
  );
}
