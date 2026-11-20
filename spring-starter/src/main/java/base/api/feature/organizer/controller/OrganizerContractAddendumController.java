package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.OrganizerContractAddendumResponse;
import base.api.feature.organizer.service.OrganizerContractAddendumService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class OrganizerContractAddendumController extends BaseAPIController {
    private final OrganizerContractAddendumService service;
    public record Issue(@NotNull @Positive Long contractId, @NotBlank @Pattern(regexp = "[a-f0-9]{64}") String contentHash) {}
    public record Confirmation(@NotNull @Positive Long addendumId, @NotBlank @Pattern(regexp = "[a-f0-9]{64}") String contentHash) {}
    public record Signature(@NotNull @Positive Long addendumId, @NotBlank @Pattern(regexp = "[a-f0-9]{64}") String contentHash,
            @NotBlank @Size(max = 12) String otp, @AssertTrue boolean consent) {
        @Override public String toString() { return "Signature[addendumId=" + addendumId + ", otp=REDACTED]"; }
    }

    @GetMapping("/api/organizer/contract/addenda") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<List<OrganizerContractAddendumResponse>>> ownerList() { return success(service.ownerList(getCurrentUserId())); }
    @GetMapping("/api/admin/organizer-applications/{profileId}/contract/addenda") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<OrganizerContractAddendumResponse>>> adminList(@PathVariable @Positive Long profileId) {
        return success(service.adminList(getCurrentUserId(), profileId));
    }
    @PostMapping("/api/admin/organizer-applications/{profileId}/contract/addenda") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerContractAddendumResponse>> issue(@PathVariable @Positive Long profileId, @Valid @RequestBody Issue input) {
        return success(service.issue(getCurrentUserId(), profileId, input.contractId(), input.contentHash()));
    }
    @PostMapping("/api/organizer/contract/addenda/otp") @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerContractAddendumResponse>> otp(@Valid @RequestBody Confirmation input) {
        return success(service.requestOtp(getCurrentUserId(), input.addendumId(), input.contentHash()));
    }
    @PostMapping("/api/organizer/contract/addenda/sign") @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerContractAddendumResponse>> sign(@Valid @RequestBody Signature input) {
        return success(service.sign(getCurrentUserId(), input.addendumId(), input.contentHash(), input.otp(), input.consent()));
    }
    @GetMapping("/api/organizer/contract/addenda/{id}/pdf") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<byte[]> ownerPdf(@PathVariable @Positive Long id, @RequestParam(defaultValue = "false") boolean download) {
        return pdf(service.ownerPdf(getCurrentUserId(), id), download);
    }
    @GetMapping("/api/admin/organizer-applications/{profileId}/contract/addenda/{id}/pdf") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> adminPdf(@PathVariable @Positive Long profileId, @PathVariable @Positive Long id,
            @RequestParam(defaultValue = "false") boolean download) { return pdf(service.adminPdf(getCurrentUserId(), profileId, id), download); }
    private ResponseEntity<byte[]> pdf(byte[] bytes, boolean download) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CACHE_CONTROL, "no-store, private")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, (download ? "attachment" : "inline") + "; filename=\"nexspace-contract-addendum.pdf\"")
                .body(bytes);
    }
}
