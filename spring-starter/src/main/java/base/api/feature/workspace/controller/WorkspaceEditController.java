package base.api.feature.workspace.controller;

import base.api.feature.workspace.service.WorkspaceEditService;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{id}/editor")
@PreAuthorize("hasRole('ORGANIZER')")
public class WorkspaceEditController extends BaseAPIController {
    private final WorkspaceEditService editor;

    @PutMapping
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> save(@PathVariable Long id,
            @Valid @RequestBody WorkspaceEditService.Input input) {
        return success(editor.save(getCurrentUserId(), id, input));
    }
}
