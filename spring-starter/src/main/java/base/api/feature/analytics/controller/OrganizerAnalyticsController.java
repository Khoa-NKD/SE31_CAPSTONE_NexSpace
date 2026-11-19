package base.api.feature.analytics.controller;

import base.api.feature.analytics.dto.AnalyticsFilter;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse.*;
import base.api.feature.analytics.service.OrganizerAnalyticsService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.enums.ResourceCategory;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/organizer/analytics", "/api/v1/organizer/analytics"})
@PreAuthorize("hasRole('ORGANIZER')")
@RequiredArgsConstructor
public class OrganizerAnalyticsController extends BaseAPIController {
    private final OrganizerAnalyticsService service;

    @GetMapping
    public ResponseEntity<ApiResponse<OrganizerAnalyticsResponse>> report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) Integer floorNumber,
            @RequestParam(required = false) Long resourceTypeId,
            @RequestParam(required = false) ResourceCategory category) {
        return success(service.report(getCurrentUserId(), new AnalyticsFilter(from, to, workspaceId, floorNumber, resourceTypeId, category)));
    }

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<Options>> options() { return success(service.options(getCurrentUserId())); }

    @GetMapping(value = "/export", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<String> export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) Integer floorNumber,
            @RequestParam(required = false) Long resourceTypeId,
            @RequestParam(required = false) ResourceCategory category,
            @RequestParam(required = false) String kind) {
        return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=organizer-analytics.csv")
                .header("Cache-Control", "no-store")
                .body(service.export(getCurrentUserId(), new AnalyticsFilter(from, to, workspaceId, floorNumber, resourceTypeId, category), kind));
    }

    @GetMapping("/ledger")
    public ResponseEntity<ApiResponse<Ledger>> ledger(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) Integer floorNumber,
            @RequestParam(required = false) Long resourceTypeId,
            @RequestParam(required = false) ResourceCategory category,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String kind) {
        return success(service.ledger(getCurrentUserId(), new AnalyticsFilter(from, to, workspaceId, floorNumber, resourceTypeId, category), page, size, kind));
    }
}
