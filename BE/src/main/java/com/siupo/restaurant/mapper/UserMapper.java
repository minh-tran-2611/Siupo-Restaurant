package com.siupo.restaurant.mapper;

import com.siupo.restaurant.dto.response.ImageResponse;
import com.siupo.restaurant.dto.response.UserResponse;
import com.siupo.restaurant.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {
    private final ImageMapper imageMapper;

    public UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }
        
        ImageResponse avatarResponse = null;
        if (user.getAvatar() != null) {
            avatarResponse = ImageResponse.builder()
                    .id(user.getAvatar().getId())
                    .url(user.getAvatar().getUrl())
                    .name(user.getAvatar().getName())
                    .build();
        }
        
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(getUserRole(user))
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .status(user.getStatus())
                .avatar(avatarResponse)
                .build();
    }

    private String getUserRole(User user) {
        return user.getClass().getSimpleName().toUpperCase();
    }
}
