package com.quiz.controller;

import com.quiz.dto.response.ApiResponse;
import com.quiz.service.admin.AdminUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/units")
@RequiredArgsConstructor
public class UnitController {

  private final AdminUnitService adminUnitService;

  @GetMapping
  public ResponseEntity<ApiResponse<?>> getActiveUnits() {
    return ResponseEntity.ok(ApiResponse.ok(adminUnitService.getActiveUnits()));
  }
}