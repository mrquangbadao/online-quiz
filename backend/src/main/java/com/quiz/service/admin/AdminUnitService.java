package com.quiz.service.admin;

import com.quiz.entity.Unit;
import com.quiz.exception.BusinessException;
import com.quiz.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUnitService {

    private final UnitRepository unitRepository;

    public List<Unit> getAllUnits() {
        return unitRepository.findAll();
    }

    public List<Unit> getActiveUnits() {
        return unitRepository.findByIsActiveTrueOrderByNameAsc();
    }

    @Transactional
    public Unit createUnit(String name, String code) {
        if (unitRepository.existsByName(name.trim())) {
            throw new BusinessException("UNIT_EXISTS", "Đơn vị '" + name + "' đã tồn tại");
        }
        return unitRepository.save(Unit.builder()
                .name(name.trim())
                .code(code != null ? code.trim() : null)
                .isActive(true)
                .build());
    }

    @Transactional
    public Unit updateUnit(Long id, String name, String code, Boolean isActive) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new BusinessException("UNIT_NOT_FOUND", "Không tìm thấy đơn vị"));
        if (name != null && !name.trim().equals(unit.getName())) {
            if (unitRepository.existsByName(name.trim())) {
                throw new BusinessException("UNIT_EXISTS", "Đơn vị '" + name + "' đã tồn tại");
            }
            unit.setName(name.trim());
        }
        if (code != null) unit.setCode(code.trim());
        if (isActive != null) unit.setIsActive(isActive);
        return unitRepository.save(unit);
    }

    @Transactional
    public void deleteUnit(Long id) {
        if (!unitRepository.existsById(id)) {
            throw new BusinessException("UNIT_NOT_FOUND", "Không tìm thấy đơn vị");
        }
        unitRepository.deleteById(id);
    }

    @Transactional
    public int importFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_FAILED", "File tải lên trống");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".xlsx")) {
            throw new BusinessException("IMPORT_FAILED", "Chỉ hỗ trợ định dạng file .xlsx");
        }

        List<Unit> units = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();
            if (lastRowNum > 5000) {
                throw new BusinessException("IMPORT_FAILED", "File vượt quá số dòng tối đa cho phép (5000 dòng)");
            }
            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String name = getCellValue(row, 0);
                String code = getCellValue(row, 1);
                if (name.isBlank()) continue;
                if (!unitRepository.existsByName(name.trim())) {
                    units.add(Unit.builder()
                            .name(name.trim())
                            .code(code.isBlank() ? null : code.trim())
                            .isActive(true)
                            .build());
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("IMPORT_FAILED", "Không thể đọc hoặc xử lý file Excel: " + e.getMessage());
        }
        unitRepository.saveAll(units);
        return units.size();
    }

    private String getCellValue(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> "";
        };
    }
}