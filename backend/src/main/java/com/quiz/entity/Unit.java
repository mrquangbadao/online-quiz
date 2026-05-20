package com.quiz.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "units", schema = "public", indexes = {
        @Index(name = "idx_units_name",
                columnList = "name"),
        @Index(name = "idx_units_active",
                columnList = "is_active")}, uniqueConstraints = {@UniqueConstraint(name = "units_name_key",
        columnNames = {"name"})})
public class Unit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 200)
    @NotNull
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Size(max = 50)
    @Column(name = "code", length = 50)
    private String code;

    @ColumnDefault("true")
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @ColumnDefault("now()")
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @ColumnDefault("now()")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


}