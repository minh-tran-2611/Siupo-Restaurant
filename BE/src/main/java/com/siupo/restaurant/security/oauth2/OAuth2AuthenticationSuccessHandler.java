package com.siupo.restaurant.security.oauth2;

import com.siupo.restaurant.dto.response.LoginResponse;
import com.siupo.restaurant.model.User;
import com.siupo.restaurant.service.authentication.AuthenticationService;
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
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final TokenService tokenService;
    private final AuthenticationService authenticationService;
    private final OAuth2AuthenticationFailureHandler failureHandler;

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

        try {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            String email = oAuth2User.getAttribute("email");
            String name = oAuth2User.getAttribute("name");
            String picture = oAuth2User.getAttribute("picture");

            if (email == null || email.isBlank()) {
                throw new OAuth2AuthenticationException("Google account did not provide an email address");
            }

            log.info("OAuth2 authentication successful for email: {}", email);

            // Idempotent safety net for both OAuth2 and OIDC flows.
            User user = authenticationService.processOAuth2User(email, name, picture);
            LoginResponse loginResponse = tokenService.generateAuthResponse(user);

            ResponseCookie refreshCookie = ResponseCookie.from(refreshTokenCookieName, loginResponse.getRefreshToken())
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Strict")
                    .maxAge(refreshTokenExpiration / 1000)
                    .path("/")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            String targetUrl = UriComponentsBuilder.fromUriString(frontendRedirectUrl)
                    .queryParam("accessToken", loginResponse.getAccessToken())
                    .queryParam("email", email)
                    .build()
                    .toUriString();

            log.info("Redirecting authenticated OAuth2 user to frontend");
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (Exception ex) {
            log.error("Unable to complete OAuth2 login", ex);
            if (!response.isCommitted()) {
                failureHandler.onAuthenticationFailure(
                        request,
                        response,
                        new OAuth2AuthenticationException("Unable to complete Google login")
                );
                return;
            }
            if (ex instanceof IOException ioException) {
                throw ioException;
            }
            if (ex instanceof ServletException servletException) {
                throw servletException;
            }
            throw new ServletException("Unable to complete OAuth2 login", ex);
        }
    }
}
