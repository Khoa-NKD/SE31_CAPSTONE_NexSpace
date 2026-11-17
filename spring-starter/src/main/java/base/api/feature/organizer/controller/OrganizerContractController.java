package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.OrganizerContractResponse;
import base.api.feature.organizer.service.OrganizerContractService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class OrganizerContractController extends BaseAPIController {
    private final OrganizerContractService service;
    public record AgreementRequest(@NotNull @Positive Long contractId, @NotBlank @Pattern(regexp = "[a-f0-9]{64}") String contentHash) {}
    public record SignRequest(@NotNull @Positive Long contractId, @NotBlank @Pattern(regexp = "[a-f0-9]{64}") String contentHash,
            @NotBlank @Size(max = 12) String otp, @AssertTrue boolean consent) {
        @Override public String toString() { return "SignRequest[contractId=" + contractId + ", otp=REDACTED]"; }
    }

    @GetMapping("/api/organizer/contract") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerContractResponse>> current() { return success(service.current(getCurrentUserId())); }
    @PostMapping("/api/organizer/contract/otp") @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<OrganizerContractResponse>> otp(@Valid @RequestBody AgreementRequest request) {
        return success(service.requestOtp(getCurrentUserId(), request.contractId(), request.contentHash()));
    }
    @PostMapping("/api/organizer/contract/sign") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerContractResponse>> sign(@Valid @RequestBody SignRequest request) {
        return success(service.sign(getCurrentUserId(), request.contractId(), request.contentHash(), request.otp(), request.consent()));
    }
    @GetMapping("/api/organizer/contract/pdf") @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public ResponseEntity<byte[]> ownerPdf(@RequestParam(defaultValue = "false") boolean download) {
        return pdf(service.ownerPdf(getCurrentUserId()), download);
    }
    @GetMapping("/api/admin/organizer-applications/{id}/contract") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrganizerContractResponse>> admin(@PathVariable @Positive Long id) {
        return success(service.adminCurrent(getCurrentUserId(), id));
    }
    @GetMapping("/api/admin/organizer-applications/{id}/contract/pdf") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> adminPdf(@PathVariable @Positive Long id, @RequestParam(defaultValue = "false") boolean download) {
        return pdf(service.adminPdf(getCurrentUserId(), id), download);
    }
    private ResponseEntity<byte[]> pdf(byte[] bytes, boolean download) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "no-store, private")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, (download ? "attachment" : "inline") + "; filename=\"nexspace-organizer-agreement.pdf\"")
                .body(bytes);
    }
}
