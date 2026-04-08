package com.siupo.restaurant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeakHourResponse {
    private Integer hour; // 0-23
    private Long orderCount;
    private Double revenue;
    private String timeRange; // e.g., "12:00 - 13:00"
}
