package com.siupo.restaurant.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReviewVisibilityRequest {
    @NotNull(message = "Hidden status is required")
    private Boolean hidden;
}
