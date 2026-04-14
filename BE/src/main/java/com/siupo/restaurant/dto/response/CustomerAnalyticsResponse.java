package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAnalyticsResponse {
    private Long totalCustomers;
    private Long newCustomers; // Based on period
    private Long activeCustomers; // Customers with orders in period
    private Double averageOrdersPerCustomer;
    private Double retentionRate; // Percentage
}
