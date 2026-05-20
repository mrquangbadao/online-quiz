package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users", schema = "public", uniqueConstraints = {@UniqueConstraint(name = "users_username_key", columnNames = {"username"})})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 100)
    @NotNull
    @Column(name = "username", nullable = false, length = 100)
    private String username;

    @Size(max = 255)
    @NotNull
    @Column(name = "password", nullable = false)
    private String password;

    @Size(max = 200)
    @Column(name = "full_name", length = 200)
    private String fullName;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'ADMIN'")
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private String role = "ADMIN";

    @ColumnDefault("true")
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @ColumnDefault("now()")
    @Column(name = "created_at")
    private LocalDateTime createdAt;


}