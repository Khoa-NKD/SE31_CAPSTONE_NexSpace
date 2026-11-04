package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.OrganizerVerificationDocumentResponse;
import base.api.feature.organizer.dto.response.OrganizerVerificationDocumentsResponse;
import base.api.feature.organizer.service.OrganizerVerificationDocumentService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/organizer/verification-documents")
@PreAuthorize("hasAnyRole('USER', 'ORGANIZER')")
@RequiredArgsConstructor
public class OrganizerVerificationDocumentController extends BaseAPIController {
    private final OrganizerVerificationDocumentService service;

    @GetMapping
    public ResponseEntity<ApiResponse<OrganizerVerificationDocumentsResponse>> listCurrentDocuments() {
        return success(service.listCurrentDocuments(getCurrentUserId()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<OrganizerVerificationDocumentResponse>> upload(
            @RequestParam("documentType") OrganizerDocumentType type,
            @RequestPart("file") MultipartFile file,
            MultipartHttpServletRequest request) {
        // One type and one file per operation; extra owner IDs and bulk file parts are not accepted.
        if (!request.getParameterMap().keySet().equals(Set.of("documentType"))
                || request.getParameterValues("documentType").length != 1
                || request.getMultiFileMap().values().stream().mapToInt(List::size).sum() != 1) {
            throw new BadRequestException("Provide exactly one documentType and one file, without extra fields");
        }
        return created(service.upload(getCurrentUserId(), type, file), "Verification document uploaded successfully");
    }
}
