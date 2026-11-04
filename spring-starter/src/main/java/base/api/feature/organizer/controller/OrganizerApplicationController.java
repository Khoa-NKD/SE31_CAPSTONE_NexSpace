package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest;
import base.api.feature.organizer.dto.response.OrganizerApplicationDetailsResponse;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
            @RequestPart(value = "businessLicense", required = false) MultipartFile businessLicense) {
        return created(service.submit(getCurrentUserId(), request, businessLicense),
                "Application submitted successfully. Pending administrator review.");
    }

    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER')")
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<OrganizerApplicationDetailsResponse>> current() {
        return success(service.current(getCurrentUserId()));
    }

    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER')")
    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<OrganizerApplicationDetailsResponse>> startDraft() {
        return success(service.startDraft(getCurrentUserId()), "Draft application is ready");
    }

    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER')")
    @PutMapping(value = "/draft", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<OrganizerApplicationDetailsResponse>> saveDraft(
            @Valid @RequestBody SaveOrganizerDraftRequest request) {
        return success(service.saveDraft(getCurrentUserId(), request), "Draft application saved");
    }

    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER')")
    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<OrganizerApplicationResponse>> submitDraft() {
        return success(service.submitDraft(getCurrentUserId()), "Application submitted successfully. Pending administrator review.");
    }
}
