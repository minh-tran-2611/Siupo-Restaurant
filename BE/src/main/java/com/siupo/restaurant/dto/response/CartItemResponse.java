package com.siupo.restaurant.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CartItemResponse {
    private Long id;
    private ProductSimpleResponse product;
    private ComboResponse combo;
    private Double price;
    private Long quantity;
}
