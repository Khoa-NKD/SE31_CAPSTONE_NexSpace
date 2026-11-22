package base.api.feature.operations.controller;

import base.api.feature.operations.dto.MaintenanceDtos.*;
import base.api.feature.operations.service.MaintenanceScheduleService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor @Validated
@RequestMapping("/api/organizer/workspaces/{workspaceId}/maintenance")
@PreAuthorize("hasRole('ORGANIZER')")
public class MaintenanceScheduleController extends BaseAPIController {
    private final MaintenanceScheduleService service;
    @GetMapping("/targets") public ResponseEntity<ApiResponse<List<Target>>> targets(@PathVariable @Positive Long workspaceId) {
        return success(service.targets(getCurrentUserId(),workspaceId));
    }
    @GetMapping public ResponseEntity<ApiResponse<List<Schedule>>> list(@PathVariable @Positive Long workspaceId,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return success(service.list(getCurrentUserId(),workspaceId,from,to));
    }
    @PostMapping public ResponseEntity<ApiResponse<List<Schedule>>> create(@PathVariable @Positive Long workspaceId,@Valid @RequestBody Input input) {
        return created(service.create(getCurrentUserId(),workspaceId,input),"Đã lưu lịch bảo trì.");
    }
    @DeleteMapping("/{key}") public ResponseEntity<ApiResponse<Void>> remove(@PathVariable @Positive Long workspaceId,@PathVariable String key) {
        service.remove(getCurrentUserId(),workspaceId,key);return success(null);
    }
}
