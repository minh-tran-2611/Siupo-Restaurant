package com.siupo.restaurant.mapper;

import com.siupo.restaurant.dto.response.ImageResponse;
import com.siupo.restaurant.model.Image;
import org.springframework.stereotype.Component;

@Component
public class ImageMapper {
    public ImageResponse toDto(Image image) {
        if (image == null) return null;
        return ImageResponse.builder()
                .id(image.getId())
                .name(image.getName())
                .url(image.getUrl())
                .build();
    }

    public Image buildEntity(String name, String url) {
        if (url == null) return null;
        return Image.builder()
                .name(name)
                .url(url)
                .build();
    }
}
