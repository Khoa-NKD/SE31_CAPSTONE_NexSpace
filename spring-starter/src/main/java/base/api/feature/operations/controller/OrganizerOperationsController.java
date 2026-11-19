package base.api.feature.operations.controller;

import base.api.feature.operations.dto.OperationsDtos.*;
import base.api.feature.operations.service.OrganizerOperationsService;
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

@RestController
@RequestMapping("/api/organizer/workspaces/{workspaceId}")
@PreAuthorize("hasRole('ORGANIZER')")
@Validated
@RequiredArgsConstructor
public class OrganizerOperationsController extends BaseAPIController {
    private final OrganizerOperationsService service;
    @GetMapping("/pricing")
    public ResponseEntity<ApiResponse<Pricing>> pricing(@PathVariable @Positive Long workspaceId) {
        return success(service.pricing(getCurrentUserId(), workspaceId));
    }
    @PostMapping("/pricing-rules")
    public ResponseEntity<ApiResponse<Rule>> createRule(@PathVariable @Positive Long workspaceId, @Valid @RequestBody RuleInput input) {
        return created(service.saveRule(getCurrentUserId(), workspaceId, null, input), "Đã lưu quy tắc giá.");
    }
    @PutMapping("/pricing-rules/{id}")
    public ResponseEntity<ApiResponse<Rule>> updateRule(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long id, @Valid @RequestBody RuleInput input) {
        return success(service.saveRule(getCurrentUserId(), workspaceId, id, input));
    }
    @DeleteMapping("/pricing-rules/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long id) {
        service.deleteRule(getCurrentUserId(), workspaceId, id); return success(null);
    }
    @GetMapping("/blocked-slots")
    public ResponseEntity<ApiResponse<List<Block>>> blocks(@PathVariable @Positive Long workspaceId,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return success(service.blocks(getCurrentUserId(), workspaceId, from, to));
    }
    @PostMapping("/blocked-slots")
    public ResponseEntity<ApiResponse<List<Block>>> createBlocks(@PathVariable @Positive Long workspaceId, @Valid @RequestBody BlockInput input) {
        return created(service.createBlocks(getCurrentUserId(), workspaceId, input), "Đã ngừng nhận đặt trong khung giờ đã chọn.");
    }
    @DeleteMapping("/blocked-slots/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBlock(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long id) {
        service.deleteBlock(getCurrentUserId(), workspaceId, id); return success(null);
    }
}
