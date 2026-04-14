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
public class BookingAnalyticsResponse {
    private Long totalBookings;
    private Long customerBookings;
    private Long guestBookings;
    private Long todayBookings;
    private Long pendingBookings;
    private Long confirmedBookings;
    private Long completedBookings;
    private Long deniedBookings;
    private Double noShowRate; // Percentage
    private Map<String, Long> bookingsByStatus;
}
