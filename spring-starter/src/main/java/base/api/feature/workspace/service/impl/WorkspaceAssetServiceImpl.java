package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.resource.repository.IBookableResourceRepository;
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
    private final IWorkspaceAssetRepository assetRepository;
    private final IAssetMaintenanceLogRepository maintenanceLogRepository;
    private final IBookableResourceRepository resourceRepository;
    private final IAmenityRepository amenityRepository;
    private final IUserRepository userRepository;
    private final IAuditService auditService;
    private final CurrentUserProvider currentUserProvider;

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
            List<WorkspaceAssetResponseDto> dtoList = allList.stream()
                    .map(WorkspaceAssetMapper::toDto)
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

        Page<WorkspaceAssetModel> page = assetRepository.searchAssets(workspaceId, status, normalizedSearch, pageable);
        return PageResponseDTO.from(page.map(WorkspaceAssetMapper::toDto));
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceAssetResponseDto getAssetById(Long workspaceId, Long assetId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        WorkspaceAssetModel asset = assetRepository.findByIdAndWorkspaceId(assetId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản với ID: " + assetId));

        return WorkspaceAssetMapper.toDto(asset);
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
        asset.setStatus(dto.getStatus() != null ? dto.getStatus() : AssetStatus.IN_USE);
        asset.setPurchaseDate(dto.getPurchaseDate());
        asset.setPurchasePrice(dto.getPurchasePrice());
        asset.setWarrantyUntil(dto.getWarrantyUntil());
        asset.setNextMaintenanceDate(dto.getNextMaintenanceDate());
        asset.setNote(dto.getNote());

        if (dto.getResourceId() != null) {
            BookableResourceModel resource = resourceRepository.findById(dto.getResourceId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy vị trí / chỗ ngồi với ID: " + dto.getResourceId()));
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

        String code = dto.getAssetCode().trim();
        if (assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCaseAndIdNot(workspaceId, code, assetId)) {
            throw new ConflictException("Mã tài sản '" + code + "' đã được sử dụng bởi một tài sản khác");
        }

        asset.setAssetCode(code);
        asset.setName(dto.getName().trim());
        if (dto.getQuantity() > 0) {
            asset.setQuantity(dto.getQuantity());
        }
        if (dto.getStatus() != null) {
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
        log.setScheduledAt(dto.getScheduledAt());
        log.setStartedAt(dto.getStartedAt());
        log.setCompletedAt(dto.getCompletedAt());
        log.setResultNote(dto.getResultNote());

        // State Machine Integrity: Transition asset status based on maintenance state
        if (log.getStatus() == MaintenanceStatus.IN_PROGRESS) {
            asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
            assetRepository.save(asset);
        } else if (log.getStatus() == MaintenanceStatus.COMPLETED) {
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
            if (dto.getStatus() == MaintenanceStatus.IN_PROGRESS) {
                asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
                if (log.getStartedAt() == null) {
                    log.setStartedAt(LocalDateTime.now());
                }
                assetRepository.save(asset);
            } else if (dto.getStatus() == MaintenanceStatus.COMPLETED) {
                if (log.getCompletedAt() == null) {
                    log.setCompletedAt(LocalDateTime.now());
                }
                if (asset.getStatus() == AssetStatus.UNDER_MAINTENANCE) {
                    asset.setStatus(AssetStatus.IN_USE);
                    assetRepository.save(asset);
                }
            } else if (dto.getStatus() == MaintenanceStatus.CANCELLED) {
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

