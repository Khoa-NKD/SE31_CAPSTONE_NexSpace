package base.api.feature.workspace.service.impl;

import base.api.feature.workspace.dto.request.AssignAmenityItemDto;
import base.api.feature.workspace.dto.request.AssignWorkspaceAmenitiesDto;
import base.api.feature.workspace.dto.response.WorkspaceAmenityResponseDto;
import base.api.feature.workspace.mapper.WorkspaceAmenityMapper;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.IWorkspaceAmenityService;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.entity.workspace.WorkspaceAmenityModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceAmenityServiceImpl implements IWorkspaceAmenityService {

    private final IWorkspaceRepository workspaceRepository;
    private final IWorkspaceAmenityRepository workspaceAmenityRepository;
    private final IAmenityRepository amenityRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceAmenityResponseDto> getWorkspaceAmenities(Long workspaceId, Long actorId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Publicly visible only when Workspace is ACTIVE
        if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
            boolean isOwner = actorId != null
                    && workspace.getOrganizer() != null
                    && workspace.getOrganizer().getId().equals(actorId);
            boolean isAdmin = currentUserProvider.isAdmin();

            if (!isOwner && !isAdmin) {
                // Strict Ownership Defense: 404 Not Found to prevent resource enumeration
                throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
            }
        }

        List<WorkspaceAmenityModel> list = workspaceAmenityRepository.findAllByWorkspaceId(workspaceId);
        return list.stream()
                .map(WorkspaceAmenityMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public List<WorkspaceAmenityResponseDto> syncWorkspaceAmenities(
            Long workspaceId,
            Long actorId,
            AssignWorkspaceAmenitiesDto dto
    ) {
        WorkspaceModel workspace = getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        List<AssignAmenityItemDto> items = dto.getAmenities();
        if (items == null || items.isEmpty()) {
            workspaceAmenityRepository.deleteAllByWorkspaceIdAndResourceIsNull(workspaceId);
            return List.of();
        }

        // Validate uniqueness and existence of each amenity
        Set<Long> seenAmenityIds = new HashSet<>();
        List<WorkspaceAmenityModel> newEntities = new ArrayList<>();

        for (AssignAmenityItemDto item : items) {
            Long amenityId = item.getAmenityId();
            if (amenityId == null) {
                throw new BadRequestException("ID tiện ích không được để trống.");
            }

            if (!seenAmenityIds.add(amenityId)) {
                throw new BadRequestException("Tiện ích ID " + amenityId + " bị trùng lặp trong yêu cầu.");
            }

            AmenityModel amenity = amenityRepository.findById(amenityId)
                    .orElseThrow(() -> new BadRequestException("Tiện ích với ID " + amenityId + " không tồn tại."));

            if (!amenity.isActive()) {
                throw new BadRequestException("Tiện ích \"" + amenity.getName() + "\" hiện đang bị vô hiệu hóa.");
            }

            // An organizer can only assign standard system amenities OR their own custom amenities
            boolean isSystemAmenity = amenity.getOrganizer() == null;
            boolean isOwner = amenity.getOrganizer() != null
                    && workspace.getOrganizer() != null
                    && amenity.getOrganizer().getId().equals(workspace.getOrganizer().getId());
            if (!isSystemAmenity && !isOwner && !currentUserProvider.isAdmin()) {
                throw new BadRequestException("Tiện ích \"" + amenity.getName() + "\" không thuộc quyền quản lý của không gian này.");
            }

            BigDecimal price = item.getAddonPricePerHour();
            if (price != null && price.compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Phụ thu theo giờ không được là số âm.");
            }

            WorkspaceAmenityModel wa = new WorkspaceAmenityModel();
            wa.setWorkspace(workspace);
            wa.setResource(null); // General workspace amenity
            wa.setAmenity(amenity);
            wa.setAddonPricePerHour(price != null ? price : BigDecimal.ZERO);

            newEntities.add(wa);
        }

        // Atomically replace existing general amenities
        workspaceAmenityRepository.deleteAllByWorkspaceIdAndResourceIsNull(workspaceId);
        List<WorkspaceAmenityModel> saved = workspaceAmenityRepository.saveAll(newEntities);

        log.info("Synced {} amenities for workspace ID: {} by actor ID: {}", saved.size(), workspaceId, actorId);

        return saved.stream()
                .map(WorkspaceAmenityMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public WorkspaceAmenityResponseDto addAmenityToWorkspace(
            Long workspaceId,
            Long actorId,
            AssignAmenityItemDto dto
    ) {
        WorkspaceModel workspace = getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        Long amenityId = dto.getAmenityId();
        if (amenityId == null) {
            throw new BadRequestException("ID tiện ích không được để trống.");
        }

        if (workspaceAmenityRepository.existsByWorkspaceIdAndAmenityIdAndResourceIsNull(workspaceId, amenityId)) {
            throw new ConflictException("Tiện ích này đã được gán cho không gian.");
        }

        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new BadRequestException("Tiện ích với ID " + amenityId + " không tồn tại."));

        if (!amenity.isActive()) {
            throw new BadRequestException("Tiện ích \"" + amenity.getName() + "\" hiện đang bị vô hiệu hóa.");
        }

        boolean isSystemAmenity = amenity.getOrganizer() == null;
        boolean isOwner = amenity.getOrganizer() != null
                && workspace.getOrganizer() != null
                && amenity.getOrganizer().getId().equals(workspace.getOrganizer().getId());
        if (!isSystemAmenity && !isOwner && !currentUserProvider.isAdmin()) {
            throw new BadRequestException("Tiện ích \"" + amenity.getName() + "\" không thuộc quyền quản lý của không gian này.");
        }

        BigDecimal price = dto.getAddonPricePerHour();
        if (price != null && price.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Phụ thu theo giờ không được là số âm.");
        }

        WorkspaceAmenityModel wa = new WorkspaceAmenityModel();
        wa.setWorkspace(workspace);
        wa.setResource(null);
        wa.setAmenity(amenity);
        wa.setAddonPricePerHour(price != null ? price : BigDecimal.ZERO);

        WorkspaceAmenityModel saved = workspaceAmenityRepository.save(wa);
        log.info("Added amenity ID: {} to workspace ID: {} by actor ID: {}", amenityId, workspaceId, actorId);

        return WorkspaceAmenityMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void removeAmenityFromWorkspace(Long workspaceId, Long amenityId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAmenityModel wa = workspaceAmenityRepository.findByWorkspaceIdAndAmenityId(workspaceId, amenityId)
                .orElseThrow(() -> new NotFoundException("Tiện ích với ID " + amenityId + " không có trong không gian này."));

        workspaceAmenityRepository.delete(wa);
        log.info("Removed amenity ID: {} from workspace ID: {} by actor ID: {}", amenityId, workspaceId, actorId);
    }

    private WorkspaceModel getWorkspaceWithOwnershipCheck(Long workspaceId, Long actorId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        boolean isOwner = actorId != null
                && workspace.getOrganizer() != null
                && workspace.getOrganizer().getId().equals(actorId);
        boolean isAdmin = currentUserProvider.isAdmin();

        if (!isOwner && !isAdmin) {
            // Strict Ownership Defense: 404 Not Found to prevent resource enumeration
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        return workspace;
    }
}

