package com.siupo.restaurant.controller;

import com.siupo.restaurant.dto.request.UpdateReviewVisibilityRequest;
import com.siupo.restaurant.dto.response.AdminReviewResponse;
import com.siupo.restaurant.dto.response.ApiResponse;
import com.siupo.restaurant.dto.response.ReviewStatisticsResponse;
import com.siupo.restaurant.service.review.AdminReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@Validated
public class AdminReviewController {
    private final AdminReviewService adminReviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminReviewResponse>>> getReviews(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @Min(1) @Max(5) Integer rating,
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(required = false) @Min(1) Long orderId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AdminReviewResponse> reviews = adminReviewService.getReviews(keyword, rating, hidden, orderId, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<AdminReviewResponse>>builder()
                .code("200").success(true).message("Reviews retrieved successfully").data(reviews).build());
    }

    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<ReviewStatisticsResponse>> getStatistics() {
        return ResponseEntity.ok(ApiResponse.<ReviewStatisticsResponse>builder()
                .code("200").success(true).message("Review statistics retrieved successfully")
                .data(adminReviewService.getStatistics()).build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminReviewResponse>> getReview(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<AdminReviewResponse>builder()
                .code("200").success(true).message("Review retrieved successfully")
                .data(adminReviewService.getReview(id)).build());
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<AdminReviewResponse>> updateVisibility(
            @PathVariable Long id, @Valid @RequestBody UpdateReviewVisibilityRequest request) {
        return ResponseEntity.ok(ApiResponse.<AdminReviewResponse>builder()
                .code("200").success(true)
                .message(request.getHidden() ? "Review hidden successfully" : "Review published successfully")
                .data(adminReviewService.updateVisibility(id, request.getHidden())).build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(@PathVariable Long id) {
        adminReviewService.deleteReview(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code("200").success(true).message("Review deleted successfully").build());
    }
}
