import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Avatar, Box, Chip, Dialog, DialogContent, DialogTitle, Divider, IconButton, Rating, Stack, Typography } from '@mui/material';

const formatDateTime = (value) =>
  value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';

const ReviewDetailDialog = ({ open, review, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pr: 1.5 }}>
      <Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
          Review details
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Review #{review?.id} · Order #{review?.orderId}
        </Typography>
      </Box>
      <IconButton aria-label="Close review details" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
      {review && (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 }}>
                {review.userName?.charAt(0)?.toUpperCase() || 'A'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {review.userName || 'Anonymous'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {review.userEmail || 'No email available'}
                </Typography>
              </Box>
            </Stack>
            <Chip
              size="small"
              color={review.hidden ? 'default' : 'success'}
              label={review.hidden ? 'Hidden' : 'Published'}
              variant={review.hidden ? 'outlined' : 'filled'}
            />
          </Box>

          <Divider />

          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  {review.itemType === 'COMBO' ? 'Combo' : 'Product'}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {review.itemType === 'COMBO' ? review.comboName || 'Deleted combo' : review.productName || 'Deleted product'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {review.itemType === 'COMBO' ? `Combo #${review.comboId}` : `Product #${review.productId}`} · Order item #
                  {review.orderItemId}
                </Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Rating value={review.rating || 0} precision={0.5} readOnly />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {Number(review.rating || 0).toFixed(1)} out of 5
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ bgcolor: 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">
              Customer feedback
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.75, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxWidth: '70ch' }}>
              {review.content || 'This customer left a rating without written feedback.'}
            </Typography>
          </Box>

          {review.imageUrls?.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Attached images ({review.imageUrls.length})
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
                {review.imageUrls.map((url, index) => (
                  <Box
                    key={`${url}-${index}`}
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      position: 'relative',
                      display: 'block',
                      aspectRatio: '4 / 3',
                      overflow: 'hidden',
                      borderRadius: 2,
                      bgcolor: 'grey.100'
                    }}
                  >
                    <Box
                      component="img"
                      src={url}
                      alt={`Review attachment ${index + 1}`}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <OpenInNewIcon
                      sx={{ position: 'absolute', right: 8, top: 8, p: 0.5, borderRadius: 1, bgcolor: 'background.paper', fontSize: 26 }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Created: {formatDateTime(review.createdAt)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {formatDateTime(review.updatedAt)}
            </Typography>
          </Stack>
        </Stack>
      )}
    </DialogContent>
  </Dialog>
);

export default ReviewDetailDialog;
