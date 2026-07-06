package com.siupo.restaurant.mapper;

import com.siupo.restaurant.dto.response.ProductResponse;
import com.siupo.restaurant.model.Product;
import com.siupo.restaurant.model.ProductImage;
import com.siupo.restaurant.model.ProductTag;
import com.siupo.restaurant.model.User;
import com.siupo.restaurant.service.wishlist.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ProductMapper {
    private final WishlistService wishlistService;

    public ProductResponse toResponse(Product product) {
        if (product == null) return null;
        return toResponseBuilder(product).build();
    }

    public ProductResponse toResponse(Product product, User user) {
        if (product == null) return null;

        return toResponseBuilder(product)
                .isWishlist(user != null && wishlistService.isProductInWishlist(user, product.getId()))
                .build();
    }

    private ProductResponse.ProductResponseBuilder toResponseBuilder(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .status(product.getStatus())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .imageUrls(product.getImages() != null
                        ? product.getImages().stream().map(ProductImage::getUrl).toList()
                        : List.of())
                .tags(product.getTags() != null
                        ? product.getTags().stream().map(ProductTag::getName).toList()
                        : List.of())
                .rating(product.getReviews() != null && !product.getReviews().isEmpty()
                        ? product.getReviews().stream()
                        .mapToDouble(r -> r.getRate() != null ? r.getRate() : 0.0)
                        .average().orElse(0.0)
                        : 0.0)
                .reviewCount(product.getReviews() != null ? product.getReviews().size() : 0)
                .isWishlist(false);
    }
}
