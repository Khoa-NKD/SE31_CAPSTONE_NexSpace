package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.OrganizerBusinessProfileResponse;
import base.api.feature.organizer.dto.request.UpdateOrganizerBusinessProfileRequest;
import jakarta.validation.Valid;
import base.api.feature.organizer.service.OrganizerBusinessProfileService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/organizer/business-profile")
@PreAuthorize("hasRole('ORGANIZER')")
@RequiredArgsConstructor
public class OrganizerBusinessProfileController extends BaseAPIController {
    private final OrganizerBusinessProfileService service;

    @GetMapping
    public ResponseEntity<ApiResponse<OrganizerBusinessProfileResponse>> getCurrentProfile() {
        return success(service.getCurrentProfile(getCurrentUserId()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<OrganizerBusinessProfileResponse>> updateCurrentProfile(
            @Valid @RequestBody UpdateOrganizerBusinessProfileRequest request) {
        return success(service.updateCurrentProfile(getCurrentUserId(), request), "Business profile updated successfully");
    }
}
