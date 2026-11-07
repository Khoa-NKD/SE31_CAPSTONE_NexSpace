package base.api.feature.resource.controller;

import base.api.feature.resource.dto.*;
import base.api.feature.resource.service.BuildingService;
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
public class OrganizerBuildingController extends BaseAPIController {
    private final BuildingService service;

    @GetMapping("/buildings")
    public ResponseEntity<ApiResponse<List<BuildingResponses.Building>>> catalog() { return success(service.catalog(getCurrentUserId())); }

    @PostMapping("/buildings")
    public ResponseEntity<ApiResponse<Long>> create(@Valid @RequestBody BuildingRequests.Building body) {
        return created(service.createBuilding(getCurrentUserId(), body), "Building created");
    }

    @PutMapping("/buildings/{id}")
    public ResponseEntity<ApiResponse<Void>> update(@PathVariable @Positive Long id, @Valid @RequestBody BuildingRequests.Building body) {
        service.updateBuilding(getCurrentUserId(), id, body); return success(null, "Building updated");
    }

    @DeleteMapping("/buildings/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable @Positive Long id, @RequestParam @NotBlank @Size(max = 100) String expectedRevision) {
        service.deleteBuilding(getCurrentUserId(), id, expectedRevision); return success(null, "Empty building deleted");
    }

    @PostMapping("/buildings/{id}/floors")
    public ResponseEntity<ApiResponse<Long>> createFloor(@PathVariable @Positive Long id, @Valid @RequestBody BuildingRequests.PhysicalFloor body) {
        return created(service.createPhysicalFloor(getCurrentUserId(), id, body), "Physical floor created");
    }

    @PutMapping("/building-floors/{id}")
    public ResponseEntity<ApiResponse<Void>> updateFloor(@PathVariable @Positive Long id, @Valid @RequestBody BuildingRequests.PhysicalFloor body) {
        service.updatePhysicalFloor(getCurrentUserId(), id, body); return success(null, "Physical floor updated");
    }

    @DeleteMapping("/building-floors/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFloor(@PathVariable @Positive Long id, @RequestParam @NotBlank @Size(max = 100) String expectedRevision) {
        service.deletePhysicalFloor(getCurrentUserId(), id, expectedRevision); return success(null, "Unused physical floor deleted");
    }

    @PostMapping("/workspaces/{workspaceId}/floor-allocations")
    public ResponseEntity<ApiResponse<ResourceResponses.FloorOption>> attach(@PathVariable @Positive Long workspaceId, @Valid @RequestBody BuildingRequests.Allocation body) {
        return created(service.attach(getCurrentUserId(), workspaceId, null, body), "Workspace area created on the physical floor");
    }

    @PostMapping("/workspaces/{workspaceId}/floor-allocations/batch")
    public ResponseEntity<ApiResponse<List<ResourceResponses.FloorOption>>> attachBatch(
            @PathVariable @Positive Long workspaceId, @Valid @RequestBody BuildingRequests.BatchAllocation body) {
        return created(service.attachBatch(getCurrentUserId(), workspaceId, body), "All selected floors linked to the workspace");
    }

    @PutMapping("/workspaces/{workspaceId}/resource-floors/{floorId}/location")
    public ResponseEntity<ApiResponse<ResourceResponses.FloorOption>> mapExisting(@PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long floorId, @Valid @RequestBody BuildingRequests.Allocation body) {
        return success(service.attach(getCurrentUserId(), workspaceId, floorId, body), "Existing layout mapped; resources and bookings preserved");
    }
}
