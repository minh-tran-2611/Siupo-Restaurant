package com.siupo.restaurant.dto.request;

import lombok.Data;

@Data
public class CategoryRequest {
    private Long id;
    private String name;
    private String imageUrl;
}