package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderAnalyticsResponse {
    private Long totalOrders;
    private Long pendingOrders;
    private Long processingOrders;
    private Long confirmedOrders;
    private Long completedOrders;
    private Long cancelledOrders;
    private Double cancelRate; // Percentage
    private Map<String, Long> ordersByStatus; // Status -> Count
    private PeakHourResponse peakHour;
    private Map<String, Long> ordersByHour; // Hour -> Count
}
