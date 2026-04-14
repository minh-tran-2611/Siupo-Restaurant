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
public class AnalyticsSummaryResponse {
    private LocalDateTime generatedAt;
    private String period;
    private RevenueAnalyticsResponse revenue;
    private OrderAnalyticsResponse orders;
    private ProductAnalyticsResponse products;
    private CustomerAnalyticsResponse customers;
    private BookingAnalyticsResponse bookings;
    private List<InsightResponse> insights;
}
