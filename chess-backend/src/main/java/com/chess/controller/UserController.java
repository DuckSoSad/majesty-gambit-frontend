package com.chess.controller;

import com.chess.entity.User;
import com.chess.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@AuthenticationPrincipal User user,
                                                  @Valid @RequestBody UpdateProfileRequest req) {
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getPhone()    != null) user.setPhone(req.getPhone());
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Data
    static class UpdateProfileRequest {
        @Size(max = 100)
        private String fullName;

        @Pattern(regexp = "^[0-9+\\-\\s]{7,20}$", message = "Số điện thoại không hợp lệ")
        private String phone;
    }

    record UserResponse(
            Long id,
            String username,
            String email,
            String fullName,
            String phone,
            String avatarUrl,
            Integer eloRating,
            String status,
            LocalDateTime createdAt
    ) {
        static UserResponse from(User u) {
            return new UserResponse(
                    u.getId(),
                    u.getUsername(),
                    u.getEmail(),
                    u.getFullName(),
                    u.getPhone(),
                    u.getAvatarUrl(),
                    u.getEloRating(),
                    u.getStatus().name(),
                    u.getCreatedAt()
            );
        }
    }
}
