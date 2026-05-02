package com.chess.controller;

import com.chess.entity.RefreshToken;
import com.chess.entity.User;
import com.chess.repository.RefreshTokenRepository;
import com.chess.repository.UserRepository;
import com.chess.security.JwtTokenProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername()))
            return ResponseEntity.badRequest().body(Map.of("error", "Username đã tồn tại"));
        if (userRepository.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest().body(Map.of("error", "Email đã tồn tại"));

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .build();
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Đăng ký thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
        );

        User user = userRepository.findByUsername(req.getUsername()).orElseThrow();
        refreshTokenRepository.deleteByUser(user);

        String accessToken  = jwtTokenProvider.generateAccessToken(req.getUsername());
        String rawRefresh   = jwtTokenProvider.generateRefreshToken(req.getUsername());

        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .token(rawRefresh)
                .expiresAt(LocalDateTime.now().plus(refreshTokenExpirationMs, ChronoUnit.MILLIS))
                .build();
        refreshTokenRepository.save(stored);

        return ResponseEntity.ok(Map.of(
                "accessToken",  accessToken,
                "refreshToken", rawRefresh,
                "tokenType",    "Bearer"
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        RefreshToken stored = refreshTokenRepository.findByToken(req.getRefreshToken())
                .orElse(null);

        if (stored == null || stored.isExpired() || !jwtTokenProvider.validateToken(req.getRefreshToken())) {
            if (stored != null) refreshTokenRepository.delete(stored);
            return ResponseEntity.status(401).body(Map.of("error", "Refresh token không hợp lệ hoặc đã hết hạn"));
        }

        String username     = jwtTokenProvider.getUsernameFromToken(req.getRefreshToken());
        String newAccessToken = jwtTokenProvider.generateAccessToken(username);

        return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tokenType",   "Bearer"
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@Valid @RequestBody RefreshTokenRequest req) {
        refreshTokenRepository.findByToken(req.getRefreshToken())
                .ifPresent(refreshTokenRepository::delete);
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }

    // ===== Inner DTOs =====

    @Data
    static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 50) private String username;
        @NotBlank @Email                    private String email;
        @NotBlank @Size(min = 6)            private String password;
    }

    @Data
    static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;
    }

    @Data
    static class RefreshTokenRequest {
        @NotBlank private String refreshToken;
    }
}
