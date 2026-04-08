package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsightResponse {
    private String type; // "positive", "negative", "neutral", "recommendation"
    private String category; // "revenue", "orders", "products", "customers", "bookings"
    private String message; // Natural language insight
    private Double value; // Numeric value if applicable
    private String unit; // "VND", "%", "orders", etc.
}
