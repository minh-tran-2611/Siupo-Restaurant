package com.siupo.restaurant.service.review;

import com.siupo.restaurant.dto.response.AdminReviewResponse;
import com.siupo.restaurant.dto.response.ReviewStatisticsResponse;
import com.siupo.restaurant.exception.base.ErrorCode;
import com.siupo.restaurant.exception.business.NotFoundException;
import com.siupo.restaurant.model.OrderItem;
import com.siupo.restaurant.model.Review;
import com.siupo.restaurant.model.ReviewImage;
import com.siupo.restaurant.repository.OrderItemRepository;
import com.siupo.restaurant.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReviewServiceImpl implements AdminReviewService {
    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AdminReviewResponse> getReviews(
            String keyword, Integer rating, Boolean hidden, Long orderId, Pageable pageable) {
        String normalizedKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        return reviewRepository.searchForAdmin(normalizedKeyword, rating, hidden, orderId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminReviewResponse getReview(Long id) {
        return toResponse(findReview(id));
    }

    @Override
    @Transactional
    public AdminReviewResponse updateVisibility(Long id, Boolean hidden) {
        Review review = findReview(id);
        review.setHidden(hidden);
        return toResponse(reviewRepository.save(review));
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewStatisticsResponse getStatistics() {
        Double average = reviewRepository.findPublishedAverageRating();
        return ReviewStatisticsResponse.builder()
                .totalReviews(reviewRepository.count())
                .publishedReviews(reviewRepository.countByHiddenFalse())
                .hiddenReviews(reviewRepository.countByHiddenTrue())
                .lowRatingReviews(reviewRepository.countPublishedLowRatings())
                .averageRating(average == null ? 0.0 : Math.round(average * 10.0) / 10.0)
                .build();
    }

    @Override
    @Transactional
    public void deleteReview(Long id) {
        Review review = findReview(id);
        OrderItem orderItem = review.getOrderItem();
        reviewRepository.delete(review);
        if (orderItem != null) {
            orderItem.setReviewed(false);
            orderItemRepository.save(orderItem);
        }
    }

    private Review findReview(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorCode.REVIEW_NOT_FOUND));
    }

    private AdminReviewResponse toResponse(Review review) {
        List<String> imageUrls = review.getImages() == null
                ? List.of()
                : review.getImages().stream().map(ReviewImage::getUrl).toList();
        Long orderId = review.getOrderItem() != null && review.getOrderItem().getOrder() != null
                ? review.getOrderItem().getOrder().getId()
                : null;

        return AdminReviewResponse.builder()
                .id(review.getId())
                .orderId(orderId)
                .orderItemId(review.getOrderItem() != null ? review.getOrderItem().getId() : null)
                .productId(review.getProduct() != null ? review.getProduct().getId() : null)
                .productName(review.getProduct() != null ? review.getProduct().getName() : null)
                .comboId(review.getCombo() != null ? review.getCombo().getId() : null)
                .comboName(review.getCombo() != null ? review.getCombo().getName() : null)
                .itemType(review.getCombo() != null ? "COMBO" : "PRODUCT")
                .userId(review.getUser() != null ? review.getUser().getId() : null)
                .userName(review.getUser() != null ? review.getUser().getFullName() : "Anonymous")
                .userEmail(review.getUser() != null ? review.getUser().getEmail() : null)
                .rating(review.getRate())
                .content(review.getContent())
                .imageUrls(imageUrls)
                .hidden(Boolean.TRUE.equals(review.getHidden()))
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
