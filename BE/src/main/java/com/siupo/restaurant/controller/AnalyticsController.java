package com.siupo.restaurant.controller;

import com.siupo.restaurant.dto.request.AnalyticsRequest;
import com.siupo.restaurant.dto.response.*;
import com.siupo.restaurant.service.analytics.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Get comprehensive analytics summary
     * GET /api/analytics/summary?period=THIS_MONTH
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AnalyticsSummaryResponse>> getSummary(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        AnalyticsSummaryResponse summary = analyticsService.getSummary(request);

        return ResponseEntity.ok(ApiResponse.<AnalyticsSummaryResponse>builder()
                .success(true)
                .code("200")
                .message("Analytics summary retrieved successfully")
                .data(summary)
                .build());
    }

    /**
     * Get revenue analytics
     * GET /api/analytics/revenue?period=THIS_MONTH
     */
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<RevenueAnalyticsResponse>> getRevenue(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        RevenueAnalyticsResponse revenue = analyticsService.getRevenueAnalytics(request);

        return ResponseEntity.ok(ApiResponse.<RevenueAnalyticsResponse>builder()
                .success(true)
                .code("200")
                .message("Revenue analytics retrieved successfully")
                .data(revenue)
                .build());
    }

    /**
     * Get order analytics
     * GET /api/analytics/orders?period=THIS_MONTH
     */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<OrderAnalyticsResponse>> getOrders(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        OrderAnalyticsResponse orders = analyticsService.getOrderAnalytics(request);

        return ResponseEntity.ok(ApiResponse.<OrderAnalyticsResponse>builder()
                .success(true)
                .code("200")
                .message("Order analytics retrieved successfully")
                .data(orders)
                .build());
    }

    /**
     * Get product analytics with top selling products
     * GET /api/analytics/products?limit=10&period=THIS_MONTH
     */
    @GetMapping("/products")
    public ResponseEntity<ApiResponse<ProductAnalyticsResponse>> getProducts(
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        ProductAnalyticsResponse products = analyticsService.getProductAnalytics(request, limit);

        return ResponseEntity.ok(ApiResponse.<ProductAnalyticsResponse>builder()
                .success(true)
                .code("200")
                .message("Product analytics retrieved successfully")
                .data(products)
                .build());
    }

    /**
     * Get top selling products
     * GET /api/analytics/products/top-selling?limit=10
     */
    @GetMapping("/products/top-selling")
    public ResponseEntity<ApiResponse<List<TopProductResponse>>> getTopSellingProducts(
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        ProductAnalyticsResponse products = analyticsService.getProductAnalytics(request, limit);

        return ResponseEntity.ok(ApiResponse.<List<TopProductResponse>>builder()
                .success(true)
                .code("200")
                .message("Top selling products retrieved successfully")
                .data(products.getTopSellingProducts())
                .build());
    }

    /**
     * Get customer analytics
     * GET /api/analytics/customers?period=THIS_MONTH
     */
    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<CustomerAnalyticsResponse>> getCustomers(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        CustomerAnalyticsResponse customers = analyticsService.getCustomerAnalytics(request);

        return ResponseEntity.ok(ApiResponse.<CustomerAnalyticsResponse>builder()
                .success(true)
                .code("200")
                .message("Customer analytics retrieved successfully")
                .data(customers)
                .build());
    }

    /**
     * Get booking analytics
     * GET /api/analytics/bookings?period=THIS_MONTH
     */
    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<BookingAnalyticsResponse>> getBookings(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        AnalyticsRequest request = AnalyticsRequest.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        BookingAnalyticsResponse bookings = analyticsService.getBookingAnalytics(request);

        return ResponseEntity.ok(ApiResponse.<BookingAnalyticsResponse>builder()
                .success(true)
                .code("200")
                .message("Booking analytics retrieved successfully")
                .data(bookings)
                .build());
    }

    /**
     * Get AI-ready insights
     * GET /api/analytics/insights
     */
    @GetMapping("/insights")
    public ResponseEntity<ApiResponse<List<InsightResponse>>> getInsights() {
        List<InsightResponse> insights = analyticsService.generateInsights();

        return ResponseEntity.ok(ApiResponse.<List<InsightResponse>>builder()
                .success(true)
                .code("200")
                .message("Insights generated successfully")
                .data(insights)
                .build());
    }
}
