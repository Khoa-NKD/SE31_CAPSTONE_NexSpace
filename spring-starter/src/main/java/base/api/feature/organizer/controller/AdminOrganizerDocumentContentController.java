package base.api.feature.organizer.controller;

import base.api.feature.organizer.service.AdminOrganizerDocumentContentService;
import base.api.shared.base.BaseAPIController;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/organizer-applications/{applicationId}/documents/{documentId}/content")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrganizerDocumentContentController extends BaseAPIController {
    private final AdminOrganizerDocumentContentService service;

    /** Binary content is deliberately outside the JSON envelope; errors retain the shared envelope. */
    @GetMapping
    public ResponseEntity<byte[]> read(@PathVariable Long applicationId, @PathVariable Long documentId,
            @RequestParam(defaultValue = "false") boolean download) {
        var content = service.read(getCurrentUserId(), applicationId, documentId);
        var disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(content.fileName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "sandbox; default-src 'none'")
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(content.contentType()))
                .contentLength(content.bytes().length).body(content.bytes());
    }
}
