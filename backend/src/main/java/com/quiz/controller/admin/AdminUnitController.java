package com.quiz.controller.admin;

import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.Unit;
import com.quiz.service.admin.AdminUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/units")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUnitController {

    private final AdminUnitService adminUnitService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAllUnits() {
        return ResponseEntity.ok(ApiResponse.ok(adminUnitService.getAllUnits()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> createUnit(@RequestBody Map<String, String> body) {
        Unit unit = adminUnitService.createUnit(body.get("name"), body.get("code"));
        return ResponseEntity.ok(ApiResponse.ok("Tạo đơn vị thành công", unit));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> updateUnit(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = body.get("name") != null ? body.get("name").toString() : null;
        String code = body.get("code") != null ? body.get("code").toString() : null;
        Boolean isActive = body.get("isActive") != null ? (Boolean) body.get("isActive") : null;
        Unit unit = adminUnitService.updateUnit(id, name, code, isActive);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật đơn vị thành công", unit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> deleteUnit(@PathVariable Long id) {
        adminUnitService.deleteUnit(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa đơn vị thành công", null));
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<?>> importUnits(@RequestParam("file") MultipartFile file) {
        int count = adminUnitService.importFromExcel(file);
        return ResponseEntity.ok(ApiResponse.ok("Đã import " + count + " đơn vị thành công", null));
    }
}
