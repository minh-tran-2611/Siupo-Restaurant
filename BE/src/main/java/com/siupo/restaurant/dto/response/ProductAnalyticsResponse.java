package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductAnalyticsResponse {
    private List<TopProductResponse> topSellingProducts;
    private List<TopProductResponse> topRevenueProducts;
    private Integer totalProductsSold;
    private Integer uniqueProductsSold;
}
