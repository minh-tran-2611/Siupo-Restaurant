package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopProductResponse {
    private Long productId;
    private String productName;
    private String productImageUrl;
    private Integer totalQuantitySold;
    private Double totalRevenue;
    private Integer orderCount;
    private Double averagePrice;
    private Integer rank;
}
