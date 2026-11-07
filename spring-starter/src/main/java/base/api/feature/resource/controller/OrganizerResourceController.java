package base.api.feature.resource.controller;

import base.api.feature.resource.dto.ResourceRequests.*;
import base.api.feature.resource.dto.ResourceResponses.*;
import base.api.feature.resource.service.OrganizerResourceService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.*;
import base.api.shared.enums.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@PreAuthorize("hasRole('ORGANIZER')")
@Validated
@RequiredArgsConstructor
public class OrganizerResourceController extends BaseAPIController {
    private final OrganizerResourceService service;

    @GetMapping("/resource-workspaces")
    public ResponseEntity<ApiResponse<List<WorkspaceOption>>> workspaces() {
        return success(service.workspaces(getCurrentUserId()));
    }

    @GetMapping("/workspaces/{workspaceId}/resource-options")
    public ResponseEntity<ApiResponse<Options>> options(@PathVariable @Positive Long workspaceId) {
        return success(service.options(getCurrentUserId(), workspaceId));
    }

    @GetMapping("/workspaces/{workspaceId}/resources")
    public ResponseEntity<ApiResponse<PageResponseDTO<Detail>>> list(
            @PathVariable @Positive Long workspaceId,
            @RequestParam(required = false) @Positive Long floorPlanId,
            @RequestParam(required = false) ResourceCategory category,
            @RequestParam(required = false) BookableResourceStatus status,
            @RequestParam(required = false) @Size(max = 100) String search,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return successPage(
                service.list(
                        getCurrentUserId(),
                        workspaceId,
                        floorPlanId,
                        category,
                        status,
                        search,
                        page,
                        size));
    }

    @PostMapping("/workspaces/{workspaceId}/resources")
    public ResponseEntity<ApiResponse<Detail>> create(
            @PathVariable @Positive Long workspaceId, @Valid @RequestBody Input input) {
        return created(
                service.create(getCurrentUserId(), workspaceId, input),
                "Resource created as DRAFT");
    }

    @GetMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<Detail>> detail(@PathVariable @Positive Long id) {
        return success(service.detail(getCurrentUserId(), id));
    }

    @PostMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/resources/batch")
    public ResponseEntity<ApiResponse<List<BatchResult>>> batch(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @Valid @RequestBody Batch input) {
        return created(service.saveBatch(getCurrentUserId(), workspaceId, floorId, input),
                "Resources saved atomically");
    }

    @PutMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<Detail>> update(
            @PathVariable @Positive Long id, @Valid @RequestBody Input input) {
        return success(service.update(getCurrentUserId(), id, input), "Resource updated");
    }

    @PatchMapping("/resources/{id}/status")
    public ResponseEntity<ApiResponse<Detail>> status(
            @PathVariable @Positive Long id, @Valid @RequestBody Status input) {
        return success(
                service.status(getCurrentUserId(), id, input),
                "Resource status updated; existing bookings are unchanged");
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable @Positive Long id,
            @RequestParam @NotBlank @Size(max = 100) String expectedRevision) {
        service.delete(getCurrentUserId(), id, expectedRevision);
        return success(null, "Resource deleted");
    }

    @PostMapping("/workspaces/{workspaceId}/resource-floors")
    public ResponseEntity<ApiResponse<FloorOption>> floor(
            @PathVariable @Positive Long workspaceId, @Valid @RequestBody Floor input) {
        return created(
                service.createFloor(getCurrentUserId(), workspaceId, input),
                "Floor created as DRAFT; publish it through Floor Plan before activating"
                        + " resources");
    }

    @PostMapping("/workspaces/{workspaceId}/resource-types")
    public ResponseEntity<ApiResponse<TypeOption>> type(
            @PathVariable @Positive Long workspaceId, @Valid @RequestBody Type input) {
        return created(
                service.createType(getCurrentUserId(), workspaceId, input),
                "Resource type created");
    }

    @PutMapping("/workspaces/{workspaceId}/resource-types/{typeId}")
    public ResponseEntity<ApiResponse<TypeOption>> updateType(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long typeId,
            @Valid @RequestBody Type input) {
        return success(service.updateType(getCurrentUserId(), workspaceId, typeId, input));
    }

    @PutMapping("/workspaces/{workspaceId}/resource-floors/{floorId}")
    public ResponseEntity<ApiResponse<FloorOption>> updateFloor(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @RequestParam @NotBlank @Size(max = 100) String expectedRevision,
            @Valid @RequestBody Floor input) {
        return success(
                service.updateFloor(
                        getCurrentUserId(), workspaceId, floorId, input, expectedRevision));
    }

    @GetMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/layout")
    public ResponseEntity<ApiResponse<FloorLayout>> layout(
            @PathVariable @Positive Long workspaceId, @PathVariable @Positive Long floorId) {
        return success(service.floorLayout(getCurrentUserId(), workspaceId, floorId));
    }

    @PatchMapping("/workspaces/{workspaceId}/resource-floors/{floorId}")
    public ResponseEntity<ApiResponse<FloorOption>> renameFloor(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @Valid @RequestBody base.api.feature.resource.dto.FloorManagement.Rename input) {
        return success(
                service.renameFloor(getCurrentUserId(), workspaceId, floorId, input),
                "Floor renamed");
    }

    @DeleteMapping("/workspaces/{workspaceId}/resource-floors/{floorId}")
    public ResponseEntity<ApiResponse<Void>> deleteFloor(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @RequestParam @NotBlank @Size(max = 100) String expectedRevision) {
        service.deleteFloor(getCurrentUserId(), workspaceId, floorId, expectedRevision);
        return success(null, "Empty floor deleted");
    }

    @PostMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/copy")
    public ResponseEntity<ApiResponse<FloorOption>> copyFloor(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @Valid @RequestBody base.api.feature.resource.dto.FloorManagement.Copy input) {
        return created(
                service.copyFloor(getCurrentUserId(), workspaceId, floorId, input),
                "Floor copied as DRAFT; bookings and calendar blocks are not copied");
    }

    @GetMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/availability")
    public ResponseEntity<ApiResponse<base.api.feature.resource.dto.FloorManagement.Availability>>
            availability(
                    @PathVariable @Positive Long workspaceId,
                    @PathVariable @Positive Long floorId,
                    @RequestParam
                            @org.springframework.format.annotation.DateTimeFormat(
                                    iso =
                                            org.springframework.format.annotation.DateTimeFormat.ISO
                                                    .DATE_TIME)
                            java.time.OffsetDateTime from,
                    @RequestParam
                            @org.springframework.format.annotation.DateTimeFormat(
                                    iso =
                                            org.springframework.format.annotation.DateTimeFormat.ISO
                                                    .DATE_TIME)
                            java.time.OffsetDateTime to) {
        return success(service.availability(getCurrentUserId(), workspaceId, floorId, from, to));
    }

    @PutMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/decorations")
    public ResponseEntity<ApiResponse<FloorLayout>> decorations(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @Valid @RequestBody base.api.feature.resource.dto.FloorDecorations.Save input) {
        return success(
                service.saveDecorations(getCurrentUserId(), workspaceId, floorId, input),
                "Layout objects saved as draft; publish the floor to update the customer map");
    }

    @PostMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/publish")
    public ResponseEntity<ApiResponse<FloorLayout>> publish(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId,
            @Valid @RequestBody PublishFloor input) {
        return success(
                service.publishFloor(getCurrentUserId(), workspaceId, floorId, input),
                "Floor published; resource activation remains a separate action");
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> integrity() {
        return ResponseEntity.status(409)
                .body(
                        new ApiResponse<>(
                                false,
                                null,
                                "Resource data changed or is referenced elsewhere. Reload and"
                                        + " retry; linked records are preserved",
                                409,
                                null));
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> queryValidation() {
        return ResponseEntity.badRequest()
                .body(
                        new ApiResponse<>(
                                false,
                                null,
                                "Invalid resource identifier, pagination or revision parameter",
                                400,
                                null));
    }
}
