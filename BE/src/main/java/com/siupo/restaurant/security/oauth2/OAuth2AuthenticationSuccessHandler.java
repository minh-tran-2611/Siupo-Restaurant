package com.siupo.restaurant.security.oauth2;

import com.siupo.restaurant.dto.response.LoginResponse;
import com.siupo.restaurant.model.User;
import com.siupo.restaurant.repository.UserRepository;
import com.siupo.restaurant.service.token.TokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final TokenService tokenService;
    private final UserRepository userRepository;

    @Value("${oauth2.frontend.redirect-url}")
    private String frontendRedirectUrl;

    @Value("${jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    @Value("${jwt.refresh-cookie-name}")
    private String refreshTokenCookieName;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        if (response.isCommitted()) {
            log.debug("Response has already been committed. Unable to redirect.");
            return;
        }

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        
        log.info("OAuth2 authentication successful for email: {}", email);

        // Get user from database (already created by CustomOAuth2UserService)
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after OAuth2 authentication"));

        // Generate tokens using TokenService (this saves refresh token to database)
        LoginResponse loginResponse = tokenService.generateAuthResponse(user);

        // Set refresh token as HttpOnly cookie (same as email/password login)
        ResponseCookie refreshCookie = ResponseCookie.from(refreshTokenCookieName, loginResponse.getRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .maxAge(refreshTokenExpiration / 1000)
                .path("/")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        // Redirect to frontend with only accessToken (no refreshToken in URL)
        String targetUrl = UriComponentsBuilder.fromUriString(frontendRedirectUrl)
                .queryParam("accessToken", loginResponse.getAccessToken())
                .queryParam("email", email)
                .build()
                .toUriString();

        log.info("Redirecting to frontend: {}", targetUrl);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
