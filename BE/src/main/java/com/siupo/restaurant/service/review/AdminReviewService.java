package com.siupo.restaurant.service.review;

import com.siupo.restaurant.dto.response.AdminReviewResponse;
import com.siupo.restaurant.dto.response.ReviewStatisticsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminReviewService {
    Page<AdminReviewResponse> getReviews(String keyword, Integer rating, Boolean hidden, Long orderId, Pageable pageable);

    AdminReviewResponse getReview(Long id);

    AdminReviewResponse updateVisibility(Long id, Boolean hidden);

    ReviewStatisticsResponse getStatistics();

    void deleteReview(Long id);
}
