package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueAnalyticsResponse {
    private Double totalRevenue;
    private Double todayRevenue;
    private Double yesterdayRevenue;
    private Double growthRate; // Percentage change (today vs yesterday)
    private Double averageOrderValue; // AOV
    private String trend; // "increasing", "decreasing", "stable"
    private Double weekRevenue;
    private Double monthRevenue;
    private Double yearRevenue;
}
