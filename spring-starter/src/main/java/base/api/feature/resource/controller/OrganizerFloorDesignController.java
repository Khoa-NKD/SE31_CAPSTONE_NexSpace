package base.api.feature.resource.controller;

import base.api.feature.resource.dto.*;
import base.api.feature.resource.service.*;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizer")
@PreAuthorize("hasRole('ORGANIZER')")
@Validated
@RequiredArgsConstructor
public class OrganizerFloorDesignController extends BaseAPIController {
    private static final String FLOOR = "/workspaces/{workspaceId}/resource-floors/{floorId}";
    private final FloorDesignService design;
    private final FloorAiService ai;

    @GetMapping(FLOOR + "/design-metrics")
    public ResponseEntity<ApiResponse<FloorDesign.Metrics>> metrics(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long floorId) {
        return success(design.metrics(getCurrentUserId(), workspaceId, floorId));
    }
    @PutMapping(FLOOR + "/design-metrics")
    public ResponseEntity<ApiResponse<FloorDesign.Metrics>> metrics(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long floorId,
            @Valid @RequestBody FloorDesign.MetricsInput input) {
        return success(design.saveMetrics(getCurrentUserId(), workspaceId, floorId, input));
    }
    @GetMapping("/layout-templates")
    public ResponseEntity<ApiResponse<List<FloorDesign.Template>>> library() { return success(design.library(getCurrentUserId())); }
    @PostMapping("/layout-templates")
    public ResponseEntity<ApiResponse<FloorDesign.Template>> createTemplate(@Valid @RequestBody FloorDesign.TemplateInput input) {
        return created(design.saveTemplate(getCurrentUserId(), null, input), "Layout template saved");
    }
    @PutMapping("/layout-templates/{id}")
    public ResponseEntity<ApiResponse<FloorDesign.Template>> updateTemplate(@PathVariable @Positive Long id, @Valid @RequestBody FloorDesign.TemplateInput input) {
        return success(design.saveTemplate(getCurrentUserId(), id, input));
    }
    @DeleteMapping("/layout-templates/{id}")
    public ResponseEntity<ApiResponse<Void>> archiveTemplate(@PathVariable @Positive Long id, @RequestParam @NotBlank @Size(max = 100) String expectedRevision) {
        design.archiveTemplate(getCurrentUserId(), id, expectedRevision); return success(null, "Template archived; placed objects are unchanged");
    }
    @GetMapping(FLOOR + "/ai/status")
    public ResponseEntity<ApiResponse<FloorDesign.Status>> status(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long floorId) {
        return success(ai.status(getCurrentUserId(), workspaceId, floorId));
    }
    @PostMapping(FLOOR + "/ai/proposals")
    public ResponseEntity<ApiResponse<FloorDesign.Proposal>> propose(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long floorId,
            @Valid @RequestBody FloorDesign.Propose input) {
        return success(ai.propose(getCurrentUserId(), workspaceId, floorId, input));
    }
    @PostMapping(FLOOR + "/ai/apply")
    public ResponseEntity<ApiResponse<ResourceResponses.FloorLayout>> apply(@PathVariable @Positive Long workspaceId, @PathVariable @Positive Long floorId,
            @Valid @RequestBody FloorDesign.Apply input) {
        return success(ai.apply(getCurrentUserId(), workspaceId, floorId, input), "AI proposal saved; bookings and pricing are unchanged");
    }
}
