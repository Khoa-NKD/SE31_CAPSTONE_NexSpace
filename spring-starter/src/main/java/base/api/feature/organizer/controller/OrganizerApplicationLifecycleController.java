package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.request.OrganizerLifecycleRequests.*;
import base.api.feature.organizer.dto.response.OrganizerLifecycleContext;
import base.api.feature.organizer.service.OrganizerApplicationLifecycleService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.enums.OrganizerDocumentType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class OrganizerApplicationLifecycleController extends BaseAPIController {
    @PostMapping("/api/admin/organizer-applications/{id}/request-changes") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> requestChanges(@PathVariable Long id, @Valid @RequestBody Rejection request) {
        return success(service.requestChanges(getCurrentUserId(), id, request), "Document changes requested");
    }
    private final OrganizerApplicationLifecycleService service;

    @PostMapping(value = "/api/organizer/applications/current/identity-photo-check", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> checkIdentityPhoto(
            @RequestParam Long applicationId, @RequestParam OrganizerDocumentType documentType,
            @RequestPart MultipartFile file) {
        service.checkIdentityPhoto(getCurrentUserId(), applicationId, documentType, file);
        return success(java.util.Map.of("valid", true));
    }
    @GetMapping("/api/admin/organizer-applications/{id}/lifecycle") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> adminContext(@PathVariable Long id) { return success(service.adminContext(getCurrentUserId(), id)); }
    @PostMapping("/api/admin/organizer-applications/{id}/approve") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> approve(@PathVariable Long id, @Valid @RequestBody Approval request) { return success(service.approve(getCurrentUserId(), id, request), "Documents approved; agreement signature required before Organizer activation"); }
    @PostMapping("/api/admin/organizer-applications/{id}/reject") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> reject(@PathVariable Long id, @Valid @RequestBody Rejection request) { return success(service.reject(getCurrentUserId(), id, request), "Organizer application rejected"); }
    @GetMapping("/api/organizer/applications/current/lifecycle") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> ownerContext() { return success(service.ownerContext(getCurrentUserId())); }
    @PutMapping("/api/organizer/applications/current/correction") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> correction(@Valid @RequestBody Correction request) { return success(service.saveCorrection(getCurrentUserId(), request), "Corrections saved; application has not been resubmitted"); }
    @PostMapping(value="/api/organizer/applications/current/correction-documents", consumes="multipart/form-data") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> document(@RequestParam Long revision, @RequestParam OrganizerDocumentType documentType,
            @RequestParam(required=false) Long expectedCurrentDocumentId, @RequestPart MultipartFile file) {
        return success(service.correctDocument(getCurrentUserId(), revision, documentType, expectedCurrentDocumentId, file), "Document correction saved; previous version retained");
    }
    @PostMapping("/api/organizer/applications/current/resubmit") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> resubmit(@Valid @RequestBody Revision request) { return success(service.resubmit(getCurrentUserId(), request), "Application resubmitted for review"); }

    @PostMapping(value="/api/organizer/applications/current/correction-documents/pages", consumes="multipart/form-data")
    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> pages(@RequestParam Long applicationId, @RequestParam Long revision,
            @RequestParam OrganizerDocumentType documentType, @RequestPart("files") java.util.List<MultipartFile> files) {
        return success(service.appendPages(getCurrentUserId(), applicationId, revision, documentType, files));
    }

    @DeleteMapping("/api/organizer/applications/current/correction-documents/{documentId}")
    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> deleteDraftDocument(@PathVariable Long documentId, @RequestParam Long revision) {
        return success(service.deleteDraftDocument(getCurrentUserId(), revision, documentId));
    }
}
