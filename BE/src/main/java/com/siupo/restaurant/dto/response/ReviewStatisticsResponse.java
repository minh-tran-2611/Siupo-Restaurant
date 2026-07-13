package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewStatisticsResponse {
    private Long totalReviews;
    private Long publishedReviews;
    private Long hiddenReviews;
    private Long lowRatingReviews;
    private Double averageRating;
}
