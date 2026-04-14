package com.siupo.restaurant.service.analytics;

import com.siupo.restaurant.dto.request.AnalyticsRequest;
import com.siupo.restaurant.dto.response.*;
import com.siupo.restaurant.enums.EOrderStatus;
import com.siupo.restaurant.model.Order;
import com.siupo.restaurant.model.OrderItem;
import com.siupo.restaurant.repository.CustomerRepository;
import com.siupo.restaurant.repository.OrderRepository;
import com.siupo.restaurant.repository.PlaceTableForCustomerRepository;
import com.siupo.restaurant.repository.PlaceTableForGuestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsServiceImpl implements AnalyticsService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final PlaceTableForCustomerRepository customerBookingRepository;
    private final PlaceTableForGuestRepository guestBookingRepository;

    @Override
    @Cacheable(value = "analytics-summary", key = "#request.period + '-' + #request.startDate + '-' + #request.endDate", unless = "#result == null")
    public AnalyticsSummaryResponse getSummary(AnalyticsRequest request) {
        return AnalyticsSummaryResponse.builder()
                .generatedAt(LocalDateTime.now())
                .period(request.getPeriod())
                .revenue(getRevenueAnalytics(request))
                .orders(getOrderAnalytics(request))
                .products(getProductAnalytics(request, 10))
                .customers(getCustomerAnalytics(request))
                .bookings(getBookingAnalytics(request))
                .insights(generateInsights())
                .build();
    }

    @Override
    @Cacheable(value = "analytics-revenue", key = "#request.period", unless = "#result == null")
    public RevenueAnalyticsResponse getRevenueAnalytics(AnalyticsRequest request) {
        DateRange range = getDateRange(request);
        
        // Calculate today's revenue
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        Double todayRevenue = orderRepository.calculateRevenue(EOrderStatus.COMPLETED, todayStart, todayEnd);
        
        // Calculate yesterday's revenue
        LocalDateTime yesterdayStart = LocalDate.now().minusDays(1).atStartOfDay();
        LocalDateTime yesterdayEnd = LocalDate.now().minusDays(1).atTime(LocalTime.MAX);
        Double yesterdayRevenue = orderRepository.calculateRevenue(EOrderStatus.COMPLETED, yesterdayStart, yesterdayEnd);
        
        // Calculate total revenue for the period
        Double totalRevenue = orderRepository.calculateRevenue(EOrderStatus.COMPLETED, range.start, range.end);
        
        // Calculate AOV
        Double aov = orderRepository.calculateAverageOrderValue(EOrderStatus.COMPLETED, range.start, range.end);
        
        // Calculate week revenue
        LocalDateTime weekStart = LocalDate.now().minusDays(7).atStartOfDay();
        Double weekRevenue = orderRepository.calculateRevenue(EOrderStatus.COMPLETED, weekStart, range.end);
        
        // Calculate month revenue
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        Double monthRevenue = orderRepository.calculateRevenue(EOrderStatus.COMPLETED, monthStart, range.end);
        
        // Calculate year revenue
        LocalDateTime yearStart = LocalDate.now().withDayOfYear(1).atStartOfDay();
        Double yearRevenue = orderRepository.calculateRevenue(EOrderStatus.COMPLETED, yearStart, range.end);
        
        // Calculate growth rate
        Double growthRate = calculateGrowthRate(todayRevenue, yesterdayRevenue);
        String trend = determineTrend(growthRate);
        
        return RevenueAnalyticsResponse.builder()
                .totalRevenue(totalRevenue != null ? totalRevenue : 0.0)
                .todayRevenue(todayRevenue != null ? todayRevenue : 0.0)
                .yesterdayRevenue(yesterdayRevenue != null ? yesterdayRevenue : 0.0)
                .growthRate(growthRate)
                .averageOrderValue(aov != null ? aov : 0.0)
                .trend(trend)
                .weekRevenue(weekRevenue != null ? weekRevenue : 0.0)
                .monthRevenue(monthRevenue != null ? monthRevenue : 0.0)
                .yearRevenue(yearRevenue != null ? yearRevenue : 0.0)
                .build();
    }

    @Override
    @Cacheable(value = "analytics-orders", key = "#request.period", unless = "#result == null")
    public OrderAnalyticsResponse getOrderAnalytics(AnalyticsRequest request) {
        DateRange range = getDateRange(request);
        
        // Get all orders in the date range
        List<Order> orders = orderRepository.findByCreatedAtBetween(range.start, range.end);
        
        // Count by status
        Long totalOrders = (long) orders.size();
        Long pendingOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.PENDING, range.start, range.end);
        Long confirmedOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.CONFIRMED, range.start, range.end);
        Long shippingOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.SHIPPING, range.start, range.end);
        Long deliveredOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.DELIVERED, range.start, range.end);
        Long completedOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.COMPLETED, range.start, range.end);
        Long canceledOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.CANCELED, range.start, range.end);
        Long waitingPaymentOrders = orderRepository.countByStatusAndDateRange(EOrderStatus.WAITING_FOR_PAYMENT, range.start, range.end);
        
        // Calculate cancel rate
        Double cancelRate = totalOrders > 0 ? (canceledOrders * 100.0 / totalOrders) : 0.0;
        
        // Orders by status map
        Map<String, Long> ordersByStatus = new HashMap<>();
        ordersByStatus.put("WAITING_FOR_PAYMENT", waitingPaymentOrders);
        ordersByStatus.put("PENDING", pendingOrders);
        ordersByStatus.put("CONFIRMED", confirmedOrders);
        ordersByStatus.put("SHIPPING", shippingOrders);
        ordersByStatus.put("DELIVERED", deliveredOrders);
        ordersByStatus.put("COMPLETED", completedOrders);
        ordersByStatus.put("CANCELED", canceledOrders);
        
        // Calculate peak hour
        PeakHourResponse peakHour = calculatePeakHour(orders);
        
        // Orders by hour
        Map<String, Long> ordersByHour = calculateOrdersByHour(orders);
        
        return OrderAnalyticsResponse.builder()
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .processingOrders(shippingOrders) // Using SHIPPING as processing
                .confirmedOrders(confirmedOrders)
                .completedOrders(completedOrders)
                .cancelledOrders(canceledOrders) // Response DTO uses "cancelled" spelling
                .cancelRate(cancelRate)
                .ordersByStatus(ordersByStatus)
                .peakHour(peakHour)
                .ordersByHour(ordersByHour)
                .build();
    }

    @Override
    @Cacheable(value = "analytics-products", key = "#request.period + '-' + #limit", unless = "#result == null")
    public ProductAnalyticsResponse getProductAnalytics(AnalyticsRequest request, Integer limit) {
        DateRange range = getDateRange(request);
        
        // Get completed orders only
        List<Order> completedOrders = orderRepository.findByStatusAndCreatedAtBetween(
                EOrderStatus.COMPLETED, range.start, range.end);
        
        // Calculate product statistics
        Map<Long, ProductStats> productStatsMap = new HashMap<>();
        
        for (Order order : completedOrders) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    Long productId = item.getProduct().getId();
                    
                    productStatsMap.putIfAbsent(productId, new ProductStats(
                            productId,
                            item.getProduct().getName(),
                            item.getProduct().getImages() != null && !item.getProduct().getImages().isEmpty() 
                                ? item.getProduct().getImages().get(0).getUrl() : null
                    ));
                    
                    ProductStats stats = productStatsMap.get(productId);
                    stats.totalQuantity += item.getQuantity().intValue();
                    stats.totalRevenue += item.getPrice() * item.getQuantity();
                    stats.orderCount += 1;
                }
            }
        }
        
        // Convert to list and sort
        List<TopProductResponse> allProducts = productStatsMap.values().stream()
                .map(stats -> TopProductResponse.builder()
                        .productId(stats.productId)
                        .productName(stats.productName)
                        .productImageUrl(stats.imageUrl)
                        .totalQuantitySold(stats.totalQuantity)
                        .totalRevenue(stats.totalRevenue)
                        .orderCount(stats.orderCount)
                        .averagePrice(stats.totalQuantity > 0 ? stats.totalRevenue / stats.totalQuantity : 0.0)
                        .build())
                .collect(Collectors.toList());
        
        // Top selling by quantity
        List<TopProductResponse> topSellingProducts = allProducts.stream()
                .sorted(Comparator.comparingInt(TopProductResponse::getTotalQuantitySold).reversed())
                .limit(limit != null ? limit : 10)
                .collect(Collectors.toList());
        
        // Add rank
        for (int i = 0; i < topSellingProducts.size(); i++) {
            topSellingProducts.get(i).setRank(i + 1);
        }
        
        // Top revenue products
        List<TopProductResponse> topRevenueProducts = allProducts.stream()
                .sorted(Comparator.comparingDouble(TopProductResponse::getTotalRevenue).reversed())
                .limit(limit != null ? limit : 10)
                .collect(Collectors.toList());
        
        // Add rank
        for (int i = 0; i < topRevenueProducts.size(); i++) {
            topRevenueProducts.get(i).setRank(i + 1);
        }
        
        return ProductAnalyticsResponse.builder()
                .topSellingProducts(topSellingProducts)
                .topRevenueProducts(topRevenueProducts)
                .totalProductsSold(allProducts.stream().mapToInt(TopProductResponse::getTotalQuantitySold).sum())
                .uniqueProductsSold(allProducts.size())
                .build();
    }

    @Override
    public CustomerAnalyticsResponse getCustomerAnalytics(AnalyticsRequest request) {
        DateRange range = getDateRange(request);
        
        // Total customers
        Long totalCustomers = customerRepository.count();
        
        // Get orders in the period to find active customers
        List<Order> orders = orderRepository.findByCreatedAtBetween(range.start, range.end);
        
        // Active customers (customers with orders in the period)
        Long activeCustomers = orders.stream()
                .map(Order::getUser)
                .filter(Objects::nonNull)
                .map(user -> user.getId())
                .distinct()
                .count();
        
        // New customers (created in the period) - simplified approach
        // Note: This would need User.createdAt field to be accurate
        Long newCustomers = 0L; // TODO: Implement if User has createdAt field
        
        // Average orders per customer
        Double averageOrdersPerCustomer = activeCustomers > 0 
                ? (double) orders.size() / activeCustomers 
                : 0.0;
        
        // Retention rate - simplified calculation
        Double retentionRate = totalCustomers > 0 
                ? (activeCustomers * 100.0 / totalCustomers) 
                : 0.0;
        
        return CustomerAnalyticsResponse.builder()
                .totalCustomers(totalCustomers)
                .newCustomers(newCustomers)
                .activeCustomers(activeCustomers)
                .averageOrdersPerCustomer(Math.round(averageOrdersPerCustomer * 100.0) / 100.0)
                .retentionRate(Math.round(retentionRate * 100.0) / 100.0)
                .build();
    }

    @Override
    public BookingAnalyticsResponse getBookingAnalytics(AnalyticsRequest request) {
        DateRange range = getDateRange(request);
        
        // Get all customer bookings
        List<com.siupo.restaurant.model.PlaceTableForCustomer> customerBookings = 
                customerBookingRepository.findByDateRange(range.start, range.end);
        
        // Get all guest bookings
        List<com.siupo.restaurant.model.PlaceTableForGuest> guestBookings = 
                guestBookingRepository.findByStartedAtBetween(range.start, range.end);
        
        // Count by status for customer bookings
        Long customerPending = customerBookingRepository.countByStatus(com.siupo.restaurant.enums.EPlaceTableStatus.PENDING);
        Long customerConfirmed = customerBookingRepository.countByStatus(com.siupo.restaurant.enums.EPlaceTableStatus.CONFIRMED);
        Long customerCompleted = customerBookingRepository.countByStatus(com.siupo.restaurant.enums.EPlaceTableStatus.COMPLETED);
        Long customerDenied = customerBookingRepository.countByStatus(com.siupo.restaurant.enums.EPlaceTableStatus.DENIED);
        
        // Count by status for guest bookings
        Long guestPending = guestBookings.stream()
                .filter(b -> b.getStatus() == com.siupo.restaurant.enums.EPlaceTableStatus.PENDING)
                .count();
        Long guestConfirmed = guestBookings.stream()
                .filter(b -> b.getStatus() == com.siupo.restaurant.enums.EPlaceTableStatus.CONFIRMED)
                .count();
        Long guestCompleted = guestBookings.stream()
                .filter(b -> b.getStatus() == com.siupo.restaurant.enums.EPlaceTableStatus.COMPLETED)
                .count();
        Long guestDenied = guestBookings.stream()
                .filter(b -> b.getStatus() == com.siupo.restaurant.enums.EPlaceTableStatus.DENIED)
                .count();
        
        // Total counts
        Long totalCustomerBookings = (long) customerBookings.size();
        Long totalGuestBookings = (long) guestBookings.size();
        Long totalBookings = totalCustomerBookings + totalGuestBookings;
        
        Long totalPending = customerPending + guestPending;
        Long totalConfirmed = customerConfirmed + guestConfirmed;
        Long totalCompleted = customerCompleted + guestCompleted;
        Long totalDenied = customerDenied + guestDenied;
        
        // Today's bookings
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        Long todayCustomerBookings = (long) customerBookingRepository.findByDateRange(todayStart, todayEnd).size();
        Long todayGuestBookings = (long) guestBookingRepository.findByStartedAtBetween(todayStart, todayEnd).size();
        Long todayBookings = todayCustomerBookings + todayGuestBookings;
        
        // Calculate no-show rate (denied bookings / total bookings)
        Double noShowRate = totalBookings > 0 
                ? (totalDenied * 100.0 / totalBookings) 
                : 0.0;
        
        // Bookings by status map
        Map<String, Long> bookingsByStatus = new HashMap<>();
        bookingsByStatus.put("PENDING", totalPending);
        bookingsByStatus.put("CONFIRMED", totalConfirmed);
        bookingsByStatus.put("COMPLETED", totalCompleted);
        bookingsByStatus.put("DENIED", totalDenied);
        
        return BookingAnalyticsResponse.builder()
                .totalBookings(totalBookings)
                .customerBookings(totalCustomerBookings)
                .guestBookings(totalGuestBookings)
                .todayBookings(todayBookings)
                .pendingBookings(totalPending)
                .confirmedBookings(totalConfirmed)
                .completedBookings(totalCompleted)
                .deniedBookings(totalDenied)
                .noShowRate(Math.round(noShowRate * 100.0) / 100.0)
                .bookingsByStatus(bookingsByStatus)
                .build();
    }

    @Override
    public List<InsightResponse> generateInsights() {
        List<InsightResponse> insights = new ArrayList<>();
        
        // Get analytics data for today and yesterday
        AnalyticsRequest todayRequest = AnalyticsRequest.builder().period("TODAY").build();
        AnalyticsRequest yesterdayRequest = AnalyticsRequest.builder().period("YESTERDAY").build();
        AnalyticsRequest monthRequest = AnalyticsRequest.builder().period("THIS_MONTH").build();
        
        RevenueAnalyticsResponse revenueAnalytics = getRevenueAnalytics(monthRequest);
        OrderAnalyticsResponse orderAnalytics = getOrderAnalytics(monthRequest);
        ProductAnalyticsResponse productAnalytics = getProductAnalytics(monthRequest, 3);
        
        // Revenue insights
        if (revenueAnalytics.getGrowthRate() != null) {
            String type = revenueAnalytics.getGrowthRate() > 0 ? "positive" : revenueAnalytics.getGrowthRate() < 0 ? "negative" : "neutral";
            insights.add(InsightResponse.builder()
                    .type(type)
                    .category("revenue")
                    .message(String.format("Doanh thu hôm nay %s %.1f%% so với hôm qua",
                            revenueAnalytics.getGrowthRate() > 0 ? "tăng" : "giảm",
                            Math.abs(revenueAnalytics.getGrowthRate())))
                    .value(revenueAnalytics.getGrowthRate())
                    .unit("%")
                    .build());
        }
        
        // AOV insight
        if (revenueAnalytics.getAverageOrderValue() != null && revenueAnalytics.getAverageOrderValue() > 0) {
            insights.add(InsightResponse.builder()
                    .type("neutral")
                    .category("revenue")
                    .message(String.format("Giá trị đơn hàng trung bình: %,.0f VND", revenueAnalytics.getAverageOrderValue()))
                    .value(revenueAnalytics.getAverageOrderValue())
                    .unit("VND")
                    .build());
        }
        
        // Cancel rate insight
        if (orderAnalytics.getCancelRate() != null) {
            String type = orderAnalytics.getCancelRate() > 10 ? "negative" : "positive";
            insights.add(InsightResponse.builder()
                    .type(type)
                    .category("orders")
                    .message(String.format("Tỉ lệ hủy đơn: %.1f%%", orderAnalytics.getCancelRate()))
                    .value(orderAnalytics.getCancelRate())
                    .unit("%")
                    .build());
            
            if (orderAnalytics.getCancelRate() > 15) {
                insights.add(InsightResponse.builder()
                        .type("recommendation")
                        .category("orders")
                        .message("Tỉ lệ hủy đơn cao. Nên kiểm tra chất lượng dịch vụ và thời gian giao hàng")
                        .build());
            }
        }
        
        // Peak hour insight
        if (orderAnalytics.getPeakHour() != null) {
            insights.add(InsightResponse.builder()
                    .type("neutral")
                    .category("orders")
                    .message(String.format("Giờ cao điểm: %s với %d đơn hàng",
                            orderAnalytics.getPeakHour().getTimeRange(),
                            orderAnalytics.getPeakHour().getOrderCount()))
                    .value(orderAnalytics.getPeakHour().getOrderCount().doubleValue())
                    .unit("orders")
                    .build());
        }
        
        // Top product insight
        if (productAnalytics.getTopSellingProducts() != null && !productAnalytics.getTopSellingProducts().isEmpty()) {
            TopProductResponse topProduct = productAnalytics.getTopSellingProducts().get(0);
            insights.add(InsightResponse.builder()
                    .type("positive")
                    .category("products")
                    .message(String.format("Sản phẩm bán chạy nhất: %s (%d phần)",
                            topProduct.getProductName(),
                            topProduct.getTotalQuantitySold()))
                    .value(topProduct.getTotalQuantitySold().doubleValue())
                    .unit("portions")
                    .build());
        }
        
        // Completion rate insight
        if (orderAnalytics.getTotalOrders() != null && orderAnalytics.getTotalOrders() > 0) {
            double completionRate = (orderAnalytics.getCompletedOrders() * 100.0) / orderAnalytics.getTotalOrders();
            String type = completionRate > 80 ? "positive" : completionRate > 60 ? "neutral" : "negative";
            insights.add(InsightResponse.builder()
                    .type(type)
                    .category("orders")
                    .message(String.format("Tỉ lệ hoàn thành đơn: %.1f%%", completionRate))
                    .value(completionRate)
                    .unit("%")
                    .build());
        }
        
        // Revenue trend recommendation
        if ("increasing".equals(revenueAnalytics.getTrend())) {
            insights.add(InsightResponse.builder()
                    .type("recommendation")
                    .category("revenue")
                    .message("Doanh thu đang tăng trưởng tốt. Nên tăng cường marketing để duy trì momentum")
                    .build());
        } else if ("decreasing".equals(revenueAnalytics.getTrend())) {
            insights.add(InsightResponse.builder()
                    .type("recommendation")
                    .category("revenue")
                    .message("Doanh thu đang giảm. Nên xem xét chạy khuyến mãi hoặc ra mắt món mới")
                    .build());
        }
        
        return insights;
    }

    // Helper methods
    
    private DateRange getDateRange(AnalyticsRequest request) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start;
        
        if (request.getPeriod() == null || request.getPeriod().isEmpty()) {
            // Default to last 30 days
            start = end.minusDays(30);
        } else {
            switch (request.getPeriod().toUpperCase()) {
                case "TODAY":
                    start = LocalDate.now().atStartOfDay();
                    break;
                case "YESTERDAY":
                    start = LocalDate.now().minusDays(1).atStartOfDay();
                    end = LocalDate.now().minusDays(1).atTime(LocalTime.MAX);
                    break;
                case "LAST_7_DAYS":
                    start = end.minusDays(7);
                    break;
                case "LAST_30_DAYS":
                    start = end.minusDays(30);
                    break;
                case "THIS_MONTH":
                    start = LocalDate.now().withDayOfMonth(1).atStartOfDay();
                    break;
                case "LAST_MONTH":
                    start = LocalDate.now().minusMonths(1).withDayOfMonth(1).atStartOfDay();
                    end = LocalDate.now().withDayOfMonth(1).minusDays(1).atTime(LocalTime.MAX);
                    break;
                case "THIS_YEAR":
                    start = LocalDate.now().withDayOfYear(1).atStartOfDay();
                    break;
                case "CUSTOM":
                    start = request.getStartDate() != null ? request.getStartDate() : end.minusDays(30);
                    end = request.getEndDate() != null ? request.getEndDate() : LocalDateTime.now();
                    break;
                default:
                    start = end.minusDays(30);
            }
        }
        
        return new DateRange(start, end);
    }
    
    private Double calculateGrowthRate(Double current, Double previous) {
        if (previous == null || previous == 0.0) {
            return current != null && current > 0 ? 100.0 : 0.0;
        }
        if (current == null) {
            return -100.0;
        }
        return ((current - previous) / previous) * 100.0;
    }
    
    private String determineTrend(Double growthRate) {
        if (growthRate > 5.0) return "increasing";
        if (growthRate < -5.0) return "decreasing";
        return "stable";
    }
    
    private PeakHourResponse calculatePeakHour(List<Order> orders) {
        Map<Integer, HourStats> hourStatsMap = new HashMap<>();
        
        for (Order order : orders) {
            int hour = order.getCreatedAt().getHour();
            hourStatsMap.putIfAbsent(hour, new HourStats(hour));
            HourStats stats = hourStatsMap.get(hour);
            stats.orderCount++;
            if (order.getStatus() == EOrderStatus.COMPLETED) {
                stats.revenue += order.getTotalPrice() != null ? order.getTotalPrice() : 0.0;
            }
        }
        
        Optional<HourStats> peakHourStats = hourStatsMap.values().stream()
                .max(Comparator.comparingLong(h -> h.orderCount));
        
        if (peakHourStats.isPresent()) {
            HourStats stats = peakHourStats.get();
            return PeakHourResponse.builder()
                    .hour(stats.hour)
                    .orderCount(stats.orderCount)
                    .revenue(stats.revenue)
                    .timeRange(String.format("%02d:00 - %02d:00", stats.hour, (stats.hour + 1) % 24))
                    .build();
        }
        
        return null;
    }
    
    private Map<String, Long> calculateOrdersByHour(List<Order> orders) {
        Map<String, Long> ordersByHour = new TreeMap<>();
        
        for (int i = 0; i < 24; i++) {
            ordersByHour.put(String.format("%02d:00", i), 0L);
        }
        
        for (Order order : orders) {
            String hourKey = String.format("%02d:00", order.getCreatedAt().getHour());
            ordersByHour.put(hourKey, ordersByHour.get(hourKey) + 1);
        }
        
        return ordersByHour;
    }
    
    // Inner classes for data aggregation
    
    private static class DateRange {
        LocalDateTime start;
        LocalDateTime end;
        
        DateRange(LocalDateTime start, LocalDateTime end) {
            this.start = start;
            this.end = end;
        }
    }
    
    private static class ProductStats {
        Long productId;
        String productName;
        String imageUrl;
        Integer totalQuantity = 0;
        Double totalRevenue = 0.0;
        Integer orderCount = 0;
        
        ProductStats(Long productId, String productName, String imageUrl) {
            this.productId = productId;
            this.productName = productName;
            this.imageUrl = imageUrl;
        }
    }
    
    private static class HourStats {
        Integer hour;
        Long orderCount = 0L;
        Double revenue = 0.0;
        
        HourStats(Integer hour) {
            this.hour = hour;
        }
    }
}
