package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.request.OrganizerLifecycleRequests.Reason;
import base.api.feature.organizer.service.OrganizerPartnerService;
import base.api.feature.organizer.service.OrganizerPartnerService.Detail;
import base.api.feature.organizer.service.OrganizerPartnerService.OperationalStatus;
import base.api.feature.organizer.service.OrganizerPartnerService.Partner;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class OrganizerPartnerController extends BaseAPIController {
    private final OrganizerPartnerService service;

    @GetMapping("/api/admin/organizer-partners")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponseDTO<Partner>>> list(
            @ModelAttribute PageRequestDTO page, @RequestParam(required = false) Boolean suspended) {
        return successPage(service.list(getCurrentUserId(), page, suspended));
    }

    @GetMapping("/api/admin/organizer-partners/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Detail>> detail(@PathVariable Long id) {
        return success(service.detail(getCurrentUserId(), id));
    }

    @PostMapping("/api/admin/organizer-partners/{id}/suspend")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Detail>> suspend(@PathVariable Long id, @Valid @RequestBody Reason request) {
        return success(service.change(getCurrentUserId(), id, request, true));
    }

    @PostMapping("/api/admin/organizer-partners/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Detail>> restore(@PathVariable Long id, @Valid @RequestBody Reason request) {
        return success(service.change(getCurrentUserId(), id, request, false));
    }

    @GetMapping("/api/organizer/operational-status")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<OperationalStatus>> status() {
        return success(service.status(getCurrentUserId()));
    }
}
