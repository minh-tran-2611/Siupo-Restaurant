package com.siupo.restaurant.service.analytics;

import com.siupo.restaurant.dto.request.AnalyticsRequest;
import com.siupo.restaurant.dto.response.*;

import java.util.List;

public interface AnalyticsService {
    
    /**
     * Get comprehensive analytics summary
     */
    AnalyticsSummaryResponse getSummary(AnalyticsRequest request);
    
    /**
     * Get revenue analytics
     */
    RevenueAnalyticsResponse getRevenueAnalytics(AnalyticsRequest request);
    
    /**
     * Get order analytics
     */
    OrderAnalyticsResponse getOrderAnalytics(AnalyticsRequest request);
    
    /**
     * Get product analytics
     */
    ProductAnalyticsResponse getProductAnalytics(AnalyticsRequest request, Integer limit);
    
    /**
     * Get customer analytics
     */
    CustomerAnalyticsResponse getCustomerAnalytics(AnalyticsRequest request);
    
    /**
     * Get booking analytics
     */
    BookingAnalyticsResponse getBookingAnalytics(AnalyticsRequest request);
    
    /**
     * Generate AI-ready insights
     */
    List<InsightResponse> generateInsights();
}
