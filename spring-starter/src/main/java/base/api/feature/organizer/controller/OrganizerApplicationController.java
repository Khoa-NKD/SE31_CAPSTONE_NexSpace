package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.dto.response.OrganizerApplicationResponse;
import base.api.feature.organizer.service.OrganizerApplicationService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/organizer/applications")
@RequiredArgsConstructor
public class OrganizerApplicationController extends BaseAPIController {
    private final OrganizerApplicationService service;

    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<OrganizerApplicationResponse>> submit(
            @Valid @RequestPart("application") SubmitOrganizerApplicationRequest request,
            @RequestPart("businessLicense") MultipartFile businessLicense) {
        return created(service.submit(getCurrentUserId(), request, businessLicense),
                "Application submitted successfully. Pending administrator review.");
    }
}
