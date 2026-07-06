package com.siupo.restaurant.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemRequest {
    private Long id;
    private Long productId;
    private Long comboId;
    private Double price;
    private Long quantity;
}
