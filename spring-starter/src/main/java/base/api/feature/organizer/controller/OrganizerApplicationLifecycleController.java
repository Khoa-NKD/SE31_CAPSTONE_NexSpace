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
    private final OrganizerApplicationLifecycleService service;
    @GetMapping("/api/admin/organizer-applications/{id}/lifecycle") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> adminContext(@PathVariable Long id) { return success(service.adminContext(getCurrentUserId(), id)); }
    @PostMapping("/api/admin/organizer-applications/{id}/approve") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> approve(@PathVariable Long id, @Valid @RequestBody Approval request) { return success(service.approve(getCurrentUserId(), id, request), "Organizer application approved"); }
    @PostMapping("/api/admin/organizer-applications/{id}/reject") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> reject(@PathVariable Long id, @Valid @RequestBody Reason request) { return success(service.reject(getCurrentUserId(), id, request), "Organizer application rejected"); }
    @PostMapping("/api/admin/organizer-applications/{id}/suspend") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerLifecycleContext>> suspend(@PathVariable Long id, @Valid @RequestBody Reason request) { return success(service.suspend(getCurrentUserId(), id, request), "Organizer operations suspended"); }
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
}
