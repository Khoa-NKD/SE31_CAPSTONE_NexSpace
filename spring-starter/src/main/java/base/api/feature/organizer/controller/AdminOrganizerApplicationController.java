package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.AdminOrganizerApplicationResponse;
import base.api.feature.organizer.service.AdminOrganizerApplicationService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.OrganizerProfileStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/organizer-applications")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOrganizerApplicationController extends BaseAPIController {
    private final AdminOrganizerApplicationService service;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponseDTO<AdminOrganizerApplicationResponse>>> list(
            @ModelAttribute PageRequestDTO pageRequest,
            @RequestParam(required = false) OrganizerProfileStatus status) {
        return successPage(service.list(getCurrentUserId(), pageRequest, status));
    }
}
