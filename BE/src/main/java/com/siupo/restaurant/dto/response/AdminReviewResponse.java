package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReviewResponse {
    private Long id;
    private Long orderId;
    private Long orderItemId;
    private Long productId;
    private String productName;
    private Long comboId;
    private String comboName;
    private String itemType;
    private Long userId;
    private String userName;
    private String userEmail;
    private Double rating;
    private String content;
    private List<String> imageUrls;
    private Boolean hidden;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
