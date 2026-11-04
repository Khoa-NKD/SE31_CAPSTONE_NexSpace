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
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IAssetMaintenanceLogRepository;
import base.api.feature.workspace.repository.IWorkspaceAssetRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
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
import base.api.shared.enums.MaintenanceType;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkspaceAssetServiceImplTest {

    @Mock
    private IWorkspaceRepository workspaceRepository;
    @Mock
    private IWorkspaceAssetRepository assetRepository;
    @Mock
    private IAssetMaintenanceLogRepository maintenanceLogRepository;
    @Mock
    private IBookableResourceRepository resourceRepository;
    @Mock
    private IAmenityRepository amenityRepository;
    @Mock
    private IUserRepository userRepository;
    @Mock
    private IAuditService auditService;
    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private WorkspaceAssetServiceImpl service;

    private WorkspaceModel workspace;
    private UserModel organizer;
    private WorkspaceAssetModel asset;

    @BeforeEach
    void setUp() {
        organizer = new UserModel();
        organizer.setId(10L);
        organizer.setUserName("organizer1");

        workspace = new WorkspaceModel();
        workspace.setId(1L);
        workspace.setOrganizer(organizer);

        asset = new WorkspaceAssetModel();
        asset.setId(100L);
        asset.setWorkspace(workspace);
        asset.setAssetCode("PRJ-001");
        asset.setName("Máy chiếu Epson");
        asset.setQuantity(1);
        asset.setStatus(AssetStatus.IN_USE);
        asset.setPurchasePrice(BigDecimal.valueOf(10000000));
        asset.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("getWorkspaceAssets: Trả về trang tài sản khi caller là chủ sở hữu")
    void getWorkspaceAssets_Success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);

        Page<WorkspaceAssetModel> page = new PageImpl<>(List.of(asset));
        when(assetRepository.searchAssets(eq(1L), any(), any(), any(Pageable.class))).thenReturn(page);

        PageResponseDTO<WorkspaceAssetResponseDto> result = service.getWorkspaceAssets(
                1L, null, null, new PageRequestDTO(), 10L
        );

        assertThat(result.getListObjects()).hasSize(1);
        assertThat(result.getListObjects().get(0).getAssetCode()).isEqualTo("PRJ-001");
    }

    @Test
    @DisplayName("getWorkspaceAssets: Trả về toàn bộ danh sách khi all = true để UI tự filter")
    void getWorkspaceAssets_AllTrue_ReturnsAllAssets() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByWorkspaceId(1L)).thenReturn(List.of(asset));

        PageResponseDTO<WorkspaceAssetResponseDto> result = service.getWorkspaceAssets(
                1L, null, null, true, new PageRequestDTO(), 10L
        );

        assertThat(result.getListObjects()).hasSize(1);
        assertThat(result.getTotalRecords()).isEqualTo(1L);
        assertThat(result.getListObjects().get(0).getAssetCode()).isEqualTo("PRJ-001");
    }

    @Test
    @DisplayName("getWorkspaceAssets: Ném NotFoundException khi caller không sở hữu và không phải admin (Strict Defense)")
    void getWorkspaceAssets_UnauthorizedCaller_ThrowsNotFound() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);

        assertThatThrownBy(() -> service.getWorkspaceAssets(1L, null, null, new PageRequestDTO(), 999L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("getAssetById: Trả về chi tiết tài sản khi tìm thấy")
    void getAssetById_Success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(100L, 1L)).thenReturn(Optional.of(asset));

        WorkspaceAssetResponseDto dto = service.getAssetById(1L, 100L, 10L);

        assertThat(dto.getId()).isEqualTo(100L);
        assertThat(dto.getName()).isEqualTo("Máy chiếu Epson");
    }

    @Test
    @DisplayName("getAssetById: Ném NotFoundException khi tài sản không tồn tại")
    void getAssetById_NotFound_ThrowsNotFound() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getAssetById(1L, 999L, 10L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("createAsset: Tạo mới thành công khi mã code chưa tồn tại và ghi audit log")
    void createAsset_Success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCase(1L, "PRJ-002")).thenReturn(false);
        when(assetRepository.save(any(WorkspaceAssetModel.class))).thenAnswer(inv -> {
            WorkspaceAssetModel a = inv.getArgument(0);
            a.setId(101L);
            return a;
        });

        CreateWorkspaceAssetDto dto = CreateWorkspaceAssetDto.builder()
                .assetCode("PRJ-002")
                .name("Máy chiếu Sony")
                .quantity(2)
                .status(AssetStatus.IN_USE)
                .purchaseDate(LocalDate.now())
                .purchasePrice(BigDecimal.valueOf(18000000))
                .build();

        WorkspaceAssetResponseDto result = service.createAsset(1L, dto, 10L);

        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getAssetCode()).isEqualTo("PRJ-002");
        verify(auditService).log(any(), eq("WORKSPACE"), eq("CREATE_ASSET"), eq("WorkspaceAssetModel"), eq(101L), any());
    }

    @Test
    @DisplayName("createAsset: Ném ConflictException khi mã code đã tồn tại trong workspace")
    void createAsset_DuplicateCode_ThrowsConflict() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCase(1L, "PRJ-001")).thenReturn(true);

        CreateWorkspaceAssetDto dto = CreateWorkspaceAssetDto.builder()
                .assetCode("PRJ-001")
                .name("Máy chiếu Epson")
                .quantity(1)
                .build();

        assertThatThrownBy(() -> service.createAsset(1L, dto, 10L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("createAsset: Gắn vị trí resource và tiện ích amenity thành công")
    void createAsset_WithResourceAndAmenity_Success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCase(1L, "TV-001")).thenReturn(false);

        BookableResourceModel resource = new BookableResourceModel();
        resource.setId(20L);
        resource.setLabel("Phòng họp Sapphire");
        when(resourceRepository.findById(20L)).thenReturn(Optional.of(resource));

        AmenityModel amenity = new AmenityModel();
        amenity.setId(5L);
        amenity.setName("Smart TV 65 inch");
        when(amenityRepository.findById(5L)).thenReturn(Optional.of(amenity));

        when(assetRepository.save(any(WorkspaceAssetModel.class))).thenAnswer(inv -> {
            WorkspaceAssetModel a = inv.getArgument(0);
            a.setId(102L);
            return a;
        });

        CreateWorkspaceAssetDto dto = CreateWorkspaceAssetDto.builder()
                .assetCode("TV-001")
                .name("Tivi Samsung 65 inch")
                .quantity(1)
                .resourceId(20L)
                .amenityId(5L)
                .build();

        WorkspaceAssetResponseDto result = service.createAsset(1L, dto, 10L);

        assertThat(result.getId()).isEqualTo(102L);
        assertThat(result.getResourceId()).isEqualTo(20L);
        assertThat(result.getResourceName()).isEqualTo("Phòng họp Sapphire");
        assertThat(result.getAmenityId()).isEqualTo(5L);
        assertThat(result.getAmenityName()).isEqualTo("Smart TV 65 inch");
    }

    @Test
    @DisplayName("updateAsset: Cập nhật thành công và ghi audit log")
    void updateAsset_Success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(100L, 1L)).thenReturn(Optional.of(asset));
        when(assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCaseAndIdNot(1L, "PRJ-001-MOD", 100L)).thenReturn(false);
        when(assetRepository.save(any(WorkspaceAssetModel.class))).thenReturn(asset);

        UpdateWorkspaceAssetDto updateDto = UpdateWorkspaceAssetDto.builder()
                .assetCode("PRJ-001-MOD")
                .name("Máy chiếu Epson Đã Nâng Cấp")
                .quantity(1)
                .status(AssetStatus.UNDER_MAINTENANCE)
                .build();

        WorkspaceAssetResponseDto result = service.updateAsset(1L, 100L, updateDto, 10L);

        assertThat(result.getAssetCode()).isEqualTo("PRJ-001-MOD");
        assertThat(result.getName()).isEqualTo("Máy chiếu Epson Đã Nâng Cấp");
        verify(auditService).log(any(), eq("WORKSPACE"), eq("UPDATE_ASSET"), eq("WorkspaceAssetModel"), eq(100L), any());
    }

    @Test
    @DisplayName("updateAsset: Ném ConflictException khi mã code bị trùng với tài sản khác")
    void updateAsset_DuplicateCode_ThrowsConflict() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(100L, 1L)).thenReturn(Optional.of(asset));
        when(assetRepository.existsByWorkspaceIdAndAssetCodeIgnoreCaseAndIdNot(1L, "PRJ-EXISTING", 100L)).thenReturn(true);

        UpdateWorkspaceAssetDto updateDto = UpdateWorkspaceAssetDto.builder()
                .assetCode("PRJ-EXISTING")
                .name("Máy chiếu")
                .quantity(1)
                .build();

        assertThatThrownBy(() -> service.updateAsset(1L, 100L, updateDto, 10L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("deleteAsset: Xóa thành công và ghi audit log")
    void deleteAsset_Success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(100L, 1L)).thenReturn(Optional.of(asset));

        service.deleteAsset(1L, 100L, 10L);

        verify(assetRepository).delete(asset);
        verify(auditService).log(any(), eq("WORKSPACE"), eq("DELETE_ASSET"), eq("WorkspaceAssetModel"), eq(100L), any());
    }

    @Test
    @DisplayName("createMaintenanceLog: Tự động chuyển asset status sang UNDER_MAINTENANCE khi tạo log trạng thái IN_PROGRESS")
    void createMaintenanceLog_InProgress_AutoTransitionsAssetStatus() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(100L, 1L)).thenReturn(Optional.of(asset));
        when(maintenanceLogRepository.save(any(AssetMaintenanceLogModel.class))).thenAnswer(inv -> {
            AssetMaintenanceLogModel log = inv.getArgument(0);
            log.setId(500L);
            return log;
        });

        CreateMaintenanceLogDto dto = CreateMaintenanceLogDto.builder()
                .maintenanceType(MaintenanceType.REPAIR)
                .status(MaintenanceStatus.IN_PROGRESS)
                .description("Sửa nguồn máy chiếu")
                .performedBy("Thợ sửa thiết bị")
                .cost(BigDecimal.valueOf(800000))
                .build();

        MaintenanceLogResponseDto result = service.createMaintenanceLog(1L, 100L, dto, 10L);

        assertThat(result.getId()).isEqualTo(500L);
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.UNDER_MAINTENANCE);
        verify(assetRepository).save(asset);
        verify(auditService).log(any(), eq("WORKSPACE"), eq("CREATE_MAINTENANCE_LOG"), eq("AssetMaintenanceLogModel"), eq(500L), any());
    }

    @Test
    @DisplayName("updateMaintenanceLog: Tự động chuyển asset status về IN_USE khi chuyển log sang COMPLETED")
    void updateMaintenanceLog_Completed_AutoTransitionsAssetStatusBackToInUse() {
        asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
        AssetMaintenanceLogModel log = new AssetMaintenanceLogModel();
        log.setId(500L);
        log.setAsset(asset);
        log.setStatus(MaintenanceStatus.IN_PROGRESS);
        log.setDescription("Đang sửa máy chiếu");

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);
        when(assetRepository.findByIdAndWorkspaceId(100L, 1L)).thenReturn(Optional.of(asset));
        when(maintenanceLogRepository.findByIdAndAssetId(500L, 100L)).thenReturn(Optional.of(log));
        when(maintenanceLogRepository.save(any(AssetMaintenanceLogModel.class))).thenReturn(log);

        UpdateMaintenanceLogDto updateDto = UpdateMaintenanceLogDto.builder()
                .status(MaintenanceStatus.COMPLETED)
                .resultNote("Đã sửa xong và kiểm tra chạy tốt")
                .build();

        MaintenanceLogResponseDto result = service.updateMaintenanceLog(1L, 100L, 500L, updateDto, 10L);

        assertThat(log.getStatus()).isEqualTo(MaintenanceStatus.COMPLETED);
        assertThat(log.getCompletedAt()).isNotNull();
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.IN_USE);
        verify(assetRepository).save(asset);
    }
}
