package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.ResourceMaintenance;
import base.api.feature.workspace.dto.request.CreateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.CreateWorkspaceAssetDto;
import base.api.feature.workspace.dto.request.UpdateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceAssetDto;
import base.api.feature.workspace.dto.response.MaintenanceLogResponseDto;
import base.api.feature.workspace.dto.response.WorkspaceAssetResponseDto;
import base.api.feature.workspace.mapper.WorkspaceAssetMapper;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IAssetMaintenanceLogRepository;
import base.api.feature.workspace.repository.IWorkspaceAssetRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.IWorkspaceAssetService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.entity.workspace.AssetMaintenanceLogModel;
import base.api.shared.entity.workspace.WorkspaceAssetModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.AssetStatus;
import base.api.shared.enums.MaintenanceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceAssetServiceImpl implements IWorkspaceAssetService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "name", "assetCode", "status", "purchasePrice", "nextMaintenanceDate", "quantity"
    );

    private final IWorkspaceRepository workspaceRepository;
    private final base.api.feature.operations.repository.MaintenanceGroupRepository maintenanceGroups;
    private final IWorkspaceAssetRepository assetRepository;
    private final IAssetMaintenanceLogRepository maintenanceLogRepository;
    private final IBookableResourceRepository resourceRepository;
    private final IAmenityRepository amenityRepository;
    private final IUserRepository userRepository;
    private final IAuditService auditService;
    private final CurrentUserProvider currentUserProvider;
    private final IResourceBlockedSlotRepository blockedSlots;

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<WorkspaceAssetResponseDto> getWorkspaceAssets(
            Long workspaceId,
            AssetStatus status,
            String search,
            Boolean all,
            PageRequestDTO pageRequest,
            Long actorId
    ) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        if (Boolean.TRUE.equals(all)) {
            List<WorkspaceAssetModel> allList = assetRepository.findByWorkspaceId(workspaceId);
            var maintained = maintainedAssets(workspaceId);
            var maintainedResources = maintainedResources(workspaceId);
            List<WorkspaceAssetResponseDto> dtoList = allList.stream()
                    .map(asset -> effectiveDto(asset, maintained, maintainedResources))
                    .toList();
            int total = dtoList.size();
            return new PageResponseDTO<>(dtoList, 1, Math.max(1, total), total, 1, false, false);
        }

        PageRequestDTO safePageRequest = pageRequest != null ? pageRequest : new PageRequestDTO();
        Pageable pageable = safePageRequest.toPageable("createdAt", Sort.Direction.DESC, ALLOWED_SORT_FIELDS);

        String normalizedSearch = safePageRequest.normalizedSearch();
        if (normalizedSearch != null) {
            normalizedSearch = normalizedSearch.trim();
        }

        if (status != null) {
            var maintained = maintainedAssets(workspaceId);
            var maintainedResources = maintainedResources(workspaceId);
            var filtered = assetRepository.searchAssets(workspaceId, null, normalizedSearch,
                    Pageable.unpaged(pageable.getSort())).stream()
                    .map(asset -> effectiveDto(asset, maintained, maintainedResources))
                    .filter(asset -> asset.getStatus() == status).toList();
            int from = (int) Math.min(pageable.getOffset(), filtered.size());
            int to = Math.min(from + pageable.getPageSize(), filtered.size());
            return PageResponseDTO.from(new PageImpl<>(
                    filtered.subList(from, to), pageable, filtered.size()));
        }

        Page<WorkspaceAssetModel> page = assetRepository.searchAssets(workspaceId, status, normalizedSearch, pageable);
        var maintained = maintainedAssets(workspaceId);
        var maintainedResources = maintainedResources(workspaceId);
        return PageResponseDTO.from(page.map(asset -> effectiveDto(asset, maintained, maintainedResources)));
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceAssetResponseDto getAssetById(Long workspaceId, Long assetId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAssetModel asset = assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        return effectiveDto(asset, maintainedAssets(workspaceId), maintainedResources(workspaceId));
    }

    @Override
    @Transactional
    public WorkspaceAssetResponseDto createAsset(Long workspaceId, CreateWorkspaceAssetDto dto, Long actorId) {
        WorkspaceModel workspace = getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        String code = dto.getAssetCode().trim();
        if (assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCase(workspaceId, code)) {
            throw new ConflictException("Mã tài sản '" + code + "' đã tồn tại trong không gian này");
        }

        WorkspaceAssetModel asset = new WorkspaceAssetModel();
        asset.setWorkspace(workspace);
        asset.setAssetCode(code);
        asset.setName(dto.getName().trim());
        asset.setQuantity(dto.getQuantity() > 0 ? dto.getQuantity() : 1);
        if (dto.getStatus() == AssetStatus.UNDER_MAINTENANCE)
            throw new BadRequestException("Tạo lịch bảo trì có thời hạn sau khi thêm tài sản.");
        asset.setStatus(dto.getStatus() != null ? dto.getStatus() : AssetStatus.IN_USE);
        asset.setPurchaseDate(dto.getPurchaseDate());
        asset.setPurchasePrice(dto.getPurchasePrice());
        asset.setWarrantyUntil(dto.getWarrantyUntil());
        asset.setNextMaintenanceDate(dto.getNextMaintenanceDate());
        asset.setNote(dto.getNote());

        if (dto.getResourceId() != null) {
            BookableResourceModel resource = resourceRepository.findById(dto.getResourceId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy vị trí / chỗ ngồi với ID: " + dto.getResourceId()));
            if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null
                    || !workspaceId.equals(resource.getFloorPlan().getWorkspace().getId()))
                throw new BadRequestException("Vị trí không thuộc không gian này.");
            asset.setResource(resource);
        }

        if (dto.getAmenityId() != null) {
            AmenityModel amenity = amenityRepository.findById(dto.getAmenityId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tiện ích với ID: " + dto.getAmenityId()));
            asset.setAmenity(amenity);
        }

        WorkspaceAssetModel savedAsset = assetRepository.save(asset);

        UserModel actorUser = resolveActorUser(actorId);
        auditService.log(actorUser, "WORKSPACE", "CREATE_ASSET", "WorkspaceAssetModel",
                savedAsset.getId(), "Tạo mới tài sản " + savedAsset.getAssetCode());

        return WorkspaceAssetMapper.toDto(savedAsset);
    }

    @Override
    @Transactional
    public WorkspaceAssetResponseDto updateAsset(Long workspaceId, Long assetId, UpdateWorkspaceAssetDto dto, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAssetModel asset = assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        boolean maintenanceLocked = maintainedAssets(workspaceId).contains(assetId)
                || ResourceMaintenance.affected(asset.getResource(), maintainedResources(workspaceId));
        Long currentPlacement = asset.getResource() == null ? null : asset.getResource().getId();
        if (maintenanceLocked && !java.util.Objects.equals(currentPlacement, dto.getResourceId()))
            throw new ConflictException("Không thể đổi vị trí tài sản đang bảo trì; hãy gỡ lịch bảo trì trước.");
        String code = dto.getAssetCode().trim();
        if (assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCaseAndIdNot(workspaceId, code, assetId)) {
            throw new ConflictException("Mã tài sản '" + code + "' đã được sử dụng bởi một tài sản khác");
        }

        asset.setAssetCode(code);
        asset.setName(dto.getName().trim());
        if (dto.getQuantity() > 0) {
            asset.setQuantity(dto.getQuantity());
        }
        if (!maintainedAssets(workspaceId).contains(assetId)
                && !ResourceMaintenance.affected(asset.getResource(), maintainedResources(workspaceId))
                && dto.getStatus() != null && dto.getStatus() != AssetStatus.UNDER_MAINTENANCE) {
            asset.setStatus(dto.getStatus());
        }
        asset.setPurchaseDate(dto.getPurchaseDate());
        asset.setPurchasePrice(dto.getPurchasePrice());
        asset.setWarrantyUntil(dto.getWarrantyUntil());
        asset.setNextMaintenanceDate(dto.getNextMaintenanceDate());
        asset.setNote(dto.getNote());

        if (dto.getResourceId() != null) {
            BookableResourceModel resource = resourceRepository.findById(dto.getResourceId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy vị trí / chỗ ngồi với ID: " + dto.getResourceId()));
            if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null
                    || !workspaceId.equals(resource.getFloorPlan().getWorkspace().getId()))
                throw new BadRequestException("Vị trí không thuộc không gian này.");
            asset.setResource(resource);
        } else {
            asset.setResource(null);
        }

        if (dto.getAmenityId() != null) {
            AmenityModel amenity = amenityRepository.findById(dto.getAmenityId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tiện ích với ID: " + dto.getAmenityId()));
            asset.setAmenity(amenity);
        } else {
            asset.setAmenity(null);
        }

        WorkspaceAssetModel updatedAsset = assetRepository.save(asset);

        UserModel actorUser = resolveActorUser(actorId);
        auditService.log(actorUser, "WORKSPACE", "UPDATE_ASSET", "WorkspaceAssetModel",
                updatedAsset.getId(), "Cập nhật tài sản " + updatedAsset.getAssetCode());

        return WorkspaceAssetMapper.toDto(updatedAsset);
    }

    @Override
    @Transactional
    public void deleteAsset(Long workspaceId, Long assetId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAssetModel asset = assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        assetRepository.delete(asset);

        UserModel actorUser = resolveActorUser(actorId);
        auditService.log(actorUser, "WORKSPACE", "DELETE_ASSET", "WorkspaceAssetModel",
                assetId, "Xoá tài sản " + asset.getAssetCode());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceLogResponseDto> getMaintenanceLogs(Long workspaceId, Long assetId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        // Verify asset exists in this workspace
        assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        List<AssetMaintenanceLogModel> logs = maintenanceLogRepository.findByAssetIdOrderByCreatedAtDesc(assetId);
        return logs.stream().map(WorkspaceAssetMapper::toLogDto).toList();
    }

    @Override
    @Transactional
    public MaintenanceLogResponseDto createMaintenanceLog(Long workspaceId, Long assetId, CreateMaintenanceLogDto dto, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAssetModel asset = assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        UserModel actorUser = resolveActorUser(actorId);

        AssetMaintenanceLogModel log = new AssetMaintenanceLogModel();
        log.setAsset(asset);
        log.setMaintenanceType(dto.getMaintenanceType());
        log.setStatus(dto.getStatus() != null ? dto.getStatus() : MaintenanceStatus.SCHEDULED);
        log.setDescription(dto.getDescription().trim());
        log.setReportedBy(actorUser);
        log.setPerformedBy(dto.getPerformedBy());
        log.setCost(dto.getCost());
        var periodStart = dto.getStartedAt() != null ? dto.getStartedAt() : dto.getScheduledAt();
        if (dto.getPlannedEndAt() != null && (periodStart == null || !dto.getPlannedEndAt().isAfter(periodStart)))
            throw new BadRequestException("Kết thúc bảo trì phải sau bắt đầu.");
        log.setPlannedEndAt(dto.getPlannedEndAt());
        log.setScheduledAt(dto.getScheduledAt());
        log.setStartedAt(dto.getStartedAt());
        log.setCompletedAt(dto.getCompletedAt());
        log.setResultNote(dto.getResultNote());

        // State Machine Integrity: Transition asset status based on maintenance state
        if (log.getPlannedEndAt() == null && log.getStatus() == MaintenanceStatus.IN_PROGRESS) {
            asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
            assetRepository.save(asset);
        } else if (log.getPlannedEndAt() == null && log.getStatus() == MaintenanceStatus.COMPLETED) {
            if (log.getCompletedAt() == null) {
                log.setCompletedAt(LocalDateTime.now());
            }
            if (asset.getStatus() == AssetStatus.UNDER_MAINTENANCE) {
                asset.setStatus(AssetStatus.IN_USE);
                assetRepository.save(asset);
            }
        }

        AssetMaintenanceLogModel savedLog = maintenanceLogRepository.save(log);

        auditService.log(actorUser, "WORKSPACE", "CREATE_MAINTENANCE_LOG", "AssetMaintenanceLogModel",
                savedLog.getId(), "Ghi nhận bảo trì cho tài sản " + asset.getAssetCode());

        return WorkspaceAssetMapper.toLogDto(savedLog);
    }

    @Override
    @Transactional
    public MaintenanceLogResponseDto updateMaintenanceLog(
            Long workspaceId,
            Long assetId,
            Long logId,
            UpdateMaintenanceLogDto dto,
            Long actorId
    ) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAssetModel asset = assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        AssetMaintenanceLogModel log = maintenanceLogRepository.findByIdAndAssetId(logId, assetId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch sử bảo trì với ID: " + logId));
        if (log.getPlannedEndAt() != null && dto.getStartedAt() != null
                && !log.getPlannedEndAt().isAfter(dto.getStartedAt()))
            throw new BadRequestException("Bắt đầu bảo trì phải trước kết thúc dự kiến.");

        if (dto.getPerformedBy() != null) {
            log.setPerformedBy(dto.getPerformedBy());
        }
        if (dto.getCost() != null) {
            log.setCost(dto.getCost());
        }
        if (dto.getStartedAt() != null) {
            log.setStartedAt(dto.getStartedAt());
        }
        if (dto.getCompletedAt() != null) {
            log.setCompletedAt(dto.getCompletedAt());
        }
        if (dto.getResultNote() != null) {
            log.setResultNote(dto.getResultNote());
        }

        if (dto.getStatus() != null && dto.getStatus() != log.getStatus()) {
            log.setStatus(dto.getStatus());
            // State Machine Transition
            if (log.getPlannedEndAt() == null && dto.getStatus() == MaintenanceStatus.IN_PROGRESS) {
                asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
                if (log.getStartedAt() == null) {
                    log.setStartedAt(LocalDateTime.now());
                }
                assetRepository.save(asset);
            } else if (log.getPlannedEndAt() == null && dto.getStatus() == MaintenanceStatus.COMPLETED) {
                if (log.getCompletedAt() == null) {
                    log.setCompletedAt(LocalDateTime.now());
                }
                if (asset.getStatus() == AssetStatus.UNDER_MAINTENANCE) {
                    asset.setStatus(AssetStatus.IN_USE);
                    assetRepository.save(asset);
                }
            } else if (log.getPlannedEndAt() == null && dto.getStatus() == MaintenanceStatus.CANCELLED) {
                if (asset.getStatus() == AssetStatus.UNDER_MAINTENANCE) {
                    asset.setStatus(AssetStatus.IN_USE);
                    assetRepository.save(asset);
                }
            }
        }

        AssetMaintenanceLogModel updatedLog = maintenanceLogRepository.save(log);

        UserModel actorUser = resolveActorUser(actorId);
        auditService.log(actorUser, "WORKSPACE", "UPDATE_MAINTENANCE_LOG", "AssetMaintenanceLogModel",
                updatedLog.getId(), "Cập nhật tiến độ bảo trì cho tài sản " + asset.getAssetCode());

        return WorkspaceAssetMapper.toLogDto(updatedLog);
    }

    private Set<Long> maintainedAssets(Long workspaceId) {
        if (maintenanceGroups.wholeWorkspaceOverlaps(workspaceId,LocalDateTime.now(),LocalDateTime.now().plusNanos(1000)))
            return assetRepository.findByWorkspaceId(workspaceId).stream().map(a -> a.getId()).collect(java.util.stream.Collectors.toSet());
        return maintenanceLogRepository.findMaintainedAssetIds(workspaceId, LocalDateTime.now(),
                List.of(MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS));
    }

    private Set<Long> maintainedResources(Long workspaceId) {
        var now = LocalDateTime.now();
        return ResourceMaintenance.maintenanceIds(
                blockedSlots.findForWorkspace(workspaceId, now, now.plusNanos(1000)));
    }

    private WorkspaceAssetResponseDto effectiveDto(WorkspaceAssetModel asset,
            Set<Long> maintained, Set<Long> resources) {
        var dto = WorkspaceAssetMapper.toDto(asset);
        if (maintained.contains(asset.getId())
                || ResourceMaintenance.affected(asset.getResource(), resources))
            return dto.toBuilder().status(AssetStatus.UNDER_MAINTENANCE).build();
        return dto;
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

    private UserModel resolveActorUser(Long actorId) {
        if (actorId == null) {
            return null;
        }
        return userRepository.findById(actorId).orElse(null);
    }
}

