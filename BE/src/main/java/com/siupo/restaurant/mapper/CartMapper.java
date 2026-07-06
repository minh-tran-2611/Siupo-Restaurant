package com.siupo.restaurant.mapper;

import com.siupo.restaurant.dto.response.CartItemResponse;
import com.siupo.restaurant.dto.response.CartResponse;
import com.siupo.restaurant.dto.response.ComboResponse;
import com.siupo.restaurant.dto.response.ProductSimpleResponse;
import com.siupo.restaurant.model.Cart;
import com.siupo.restaurant.model.ProductImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CartMapper {
    private final ComboMapper comboMapper;

    public CartResponse toResponse(Cart cart) {
        if (cart == null) return null;
        // 1. Map từng CartItem thành CartItemResponse
        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .map(item -> {
                    ProductSimpleResponse productResponse = null;
                    ComboResponse comboResponse = null;
                    // Map Product
                    if (item.getProduct() != null) {
                        String imageUrl = item.getProduct().getImages().isEmpty() 
                                ? null 
                                : item.getProduct().getImages().get(0).getUrl();
                        productResponse = ProductSimpleResponse.builder()
                                .id(item.getProduct().getId())
                                .name(item.getProduct().getName())
                                .description(item.getProduct().getDescription())
                                .price(item.getProduct().getPrice())
                                .imageUrl(imageUrl)
                                .imageUrls(item.getProduct().getImages().stream()
                                        .map(ProductImage::getUrl).toList())
                                .build();
                    }
                    // Map Combo
                    if (item.getCombo() != null) {
                        comboResponse = comboMapper.toResponse(item.getCombo());
                    }
                    return CartItemResponse.builder()
                            .id(item.getId())
                            .product(productResponse)
                            .combo(comboResponse)
                            .price(item.getPrice())
                            .quantity(item.getQuantity())
                            .build();
                })
                .collect(Collectors.toList());
        // 2. Đảo ngược danh sách để hiển thị mục mới nhất ở trên cùng
        Collections.reverse(itemResponses);
        // 3. Build response cuối cùng
        return CartResponse.builder()
                .id(cart.getId())
                .totalPrice(cart.getTotalPrice())
                .items(itemResponses)
                .build();
    }
}
