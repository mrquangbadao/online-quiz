package com.quiz.controller.admin;

import com.quiz.dto.request.ChangePasswordRequest;
import com.quiz.dto.request.CreateAdminUserRequest;
import com.quiz.dto.response.AdminUserResponse;
import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.User;
import com.quiz.exception.BusinessException;
import com.quiz.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> listUsers() {
        List<AdminUserResponse> users = userRepository.findAll().stream()
                .map(u -> AdminUserResponse.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .role(u.getRole())
                        .isActive(u.getIsActive())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminUserResponse>> createUser(
            @Valid @RequestBody CreateAdminUserRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new BusinessException("USERNAME_EXISTS", "Tên đăng nhập đã tồn tại");
        }
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role("ADMIN")
                .isActive(true)
                .build();
        user = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.ok("Tạo tài khoản thành công",
                AdminUserResponse.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .role(user.getRole())
                        .isActive(user.getIsActive())
                        .createdAt(user.getCreatedAt())
                        .build()));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "Tài khoản không tồn tại"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BusinessException("WRONG_PASSWORD", "Mật khẩu hiện tại không đúng");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            Authentication authentication) {
        String currentUsername = authentication.getName();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "Tài khoản không tồn tại"));
        if (target.getUsername().equals(currentUsername)) {
            throw new BusinessException("CANNOT_DELETE_SELF", "Không thể xóa tài khoản đang đăng nhập");
        }
        userRepository.delete(target);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa tài khoản", null));
    }
}

