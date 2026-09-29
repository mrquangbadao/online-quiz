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

    @Bean
    public CommandLineRunner provisionAdmin() {
        return args -> {
            if (provisionPassword != null && !provisionPassword.trim().isEmpty()) {
                log.info("Provisioning admin account from environment configuration...");
                User admin = userRepository.findByUsername("admin").orElse(null);
                if (admin == null) {
                    admin = User.builder()
                            .username("admin")
                            .fullName("Ban Tổ chức Tỉnh đoàn")
                            .role("ADMIN")
                            .build();
                }
                admin.setPassword(passwordEncoder.encode(provisionPassword));
                admin.setIsActive(true);
                userRepository.save(admin);
                log.info("Admin account 'admin' has been successfully provisioned and activated.");
            }
        };
    }
}
