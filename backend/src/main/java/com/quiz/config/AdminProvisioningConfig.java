package com.quiz.config;

import com.quiz.entity.User;
import com.quiz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminProvisioningConfig {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${quiz.admin.provision-password:#{null}}")
    private String provisionPassword;

    @Value("${quiz.admin.force-reset-password:false}")
    private boolean forceResetPassword;

    @Bean
    public CommandLineRunner provisionAdmin() {
        return args -> {
            if (provisionPassword == null || provisionPassword.trim().isEmpty()) {
                return;
            }

            User admin = userRepository.findByUsername("admin").orElse(null);
            if (admin == null) {
                // Khởi tạo lần đầu nếu DB chưa có tài khoản admin
                admin = User.builder()
                        .username("admin")
                        .fullName("Ban Tổ chức Tỉnh đoàn")
                        .role("ADMIN")
                        .password(passwordEncoder.encode(provisionPassword))
                        .isActive(true)
                        .build();
                userRepository.save(admin);
                log.info("Admin account 'admin' has been initialized with the provisioned password.");
            } else if (forceResetPassword) {
                // Chỉ ghi đè khi quản trị viên chủ động bật cờ QUIZ_ADMIN_FORCE_RESET_PASSWORD=true
                admin.setPassword(passwordEncoder.encode(provisionPassword));
                admin.setIsActive(true);
                userRepository.save(admin);
                log.warn("Admin account 'admin' password was FORCE-RESET from environment configuration.");
            } else {
                // Mặc định: Giữ nguyên mật khẩu mà user đã đổi trong database
                log.info("Admin account 'admin' already exists. Preserving database password.");
            }
        };
    }
}
