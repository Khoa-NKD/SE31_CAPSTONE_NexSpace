package base.api.feature.workspace.service.impl;

import base.api.feature.workspace.dto.request.AssignAmenityItemDto;
import base.api.feature.workspace.dto.request.AssignWorkspaceAmenitiesDto;
import base.api.feature.workspace.dto.response.WorkspaceAmenityResponseDto;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.entity.workspace.WorkspaceAmenityModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.AmenityCategory;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceAmenityServiceImplTest {

    @Mock
    private IWorkspaceRepository workspaceRepository;

    @Mock
    private IWorkspaceAmenityRepository workspaceAmenityRepository;

    @Mock
    private IAmenityRepository amenityRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private WorkspaceAmenityServiceImpl workspaceAmenityService;

    private WorkspaceModel activeWorkspace;
    private WorkspaceModel draftWorkspace;
    private UserModel organizer;
    private AmenityModel wifiAmenity;

    @BeforeEach
    void setUp() {
        organizer = new UserModel();
        organizer.setId(10L);

        activeWorkspace = new WorkspaceModel();
        activeWorkspace.setId(1L);
        activeWorkspace.setStatus(WorkspaceStatus.ACTIVE);
        activeWorkspace.setOrganizer(organizer);

        draftWorkspace = new WorkspaceModel();
        draftWorkspace.setId(2L);
        draftWorkspace.setStatus(WorkspaceStatus.DRAFT);
        draftWorkspace.setOrganizer(organizer);

        wifiAmenity = new AmenityModel();
        wifiAmenity.setId(100L);
        wifiAmenity.setName("High-speed Wi-Fi");
        wifiAmenity.setCategory(AmenityCategory.TECH);
        wifiAmenity.setIcon("Wifi");
        wifiAmenity.setActive(true);
    }

    @Test
    @DisplayName("getWorkspaceAmenities: Không gian ACTIVE cho phép truy cập công khai")
    void getWorkspaceAmenities_ActiveWorkspace_PublicAccess() {
        WorkspaceAmenityModel wa = new WorkspaceAmenityModel();
        wa.setId(50L);
        wa.setWorkspace(activeWorkspace);
        wa.setAmenity(wifiAmenity);
        wa.setAddonPricePerHour(BigDecimal.ZERO);

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(workspaceAmenityRepository.findAllByWorkspaceId(1L)).thenReturn(List.of(wa));

        List<WorkspaceAmenityResponseDto> result = workspaceAmenityService.getWorkspaceAmenities(1L, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAmenityId()).isEqualTo(100L);
        assertThat(result.get(0).isComplimentary()).isTrue();
    }

    @Test
    @DisplayName("getWorkspaceAmenities: Không gian DRAFT người ngoài truy cập bị ném NotFoundException (Strict Ownership)")
    void getWorkspaceAmenities_DraftWorkspace_StrangerAccess_ThrowsNotFoundException() {
        when(workspaceRepository.findById(2L)).thenReturn(Optional.of(draftWorkspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);

        assertThatThrownBy(() -> workspaceAmenityService.getWorkspaceAmenities(2L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: 2");
    }

    @Test
    @DisplayName("getWorkspaceAmenities: Không gian DRAFT chủ sở hữu truy cập thành công")
    void getWorkspaceAmenities_DraftWorkspace_OwnerAccess_Success() {
        when(workspaceRepository.findById(2L)).thenReturn(Optional.of(draftWorkspace));
        when(workspaceAmenityRepository.findAllByWorkspaceId(2L)).thenReturn(List.of());

        List<WorkspaceAmenityResponseDto> result = workspaceAmenityService.getWorkspaceAmenities(2L, 10L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getWorkspaceAmenities: Không gian DRAFT admin truy cập thành công")
    void getWorkspaceAmenities_DraftWorkspace_AdminAccess_Success() {
        when(workspaceRepository.findById(2L)).thenReturn(Optional.of(draftWorkspace));
        when(currentUserProvider.isAdmin()).thenReturn(true);
        when(workspaceAmenityRepository.findAllByWorkspaceId(2L)).thenReturn(List.of());

        List<WorkspaceAmenityResponseDto> result = workspaceAmenityService.getWorkspaceAmenities(2L, 999L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("syncWorkspaceAmenities: Thành công gán danh sách tiện ích mới cho không gian")
    void syncWorkspaceAmenities_Success() {
        AssignAmenityItemDto item = new AssignAmenityItemDto();
        item.setAmenityId(100L);
        item.setAddonPricePerHour(new BigDecimal("15000"));

        AssignWorkspaceAmenitiesDto dto = new AssignWorkspaceAmenitiesDto();
        dto.setAmenities(List.of(item));

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(amenityRepository.findById(100L)).thenReturn(Optional.of(wifiAmenity));
        when(workspaceAmenityRepository.saveAll(anyList())).thenAnswer(inv -> {
            List<WorkspaceAmenityModel> list = inv.getArgument(0);
            list.get(0).setId(500L);
            return list;
        });

        List<WorkspaceAmenityResponseDto> result = workspaceAmenityService.syncWorkspaceAmenities(1L, 10L, dto);

        verify(workspaceAmenityRepository).deleteAllByWorkspaceIdAndResourceIsNull(1L);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAmenityId()).isEqualTo(100L);
        assertThat(result.get(0).getAddonPricePerHour()).isEqualByComparingTo(new BigDecimal("15000"));
        assertThat(result.get(0).isComplimentary()).isFalse();
    }

    @Test
    @DisplayName("syncWorkspaceAmenities: Xóa sạch danh sách tiện ích khi truyền list rỗng")
    void syncWorkspaceAmenities_EmptyList_DeletesAll() {
        AssignWorkspaceAmenitiesDto dto = new AssignWorkspaceAmenitiesDto();
        dto.setAmenities(List.of());

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));

        List<WorkspaceAmenityResponseDto> result = workspaceAmenityService.syncWorkspaceAmenities(1L, 10L, dto);

        verify(workspaceAmenityRepository).deleteAllByWorkspaceIdAndResourceIsNull(1L);
        verify(workspaceAmenityRepository, never()).saveAll(any());
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("syncWorkspaceAmenities: Trùng lặp amenityId trong payload ném BadRequestException")
    void syncWorkspaceAmenities_DuplicateAmenityId_ThrowsBadRequestException() {
        AssignAmenityItemDto item1 = new AssignAmenityItemDto();
        item1.setAmenityId(100L);
        AssignAmenityItemDto item2 = new AssignAmenityItemDto();
        item2.setAmenityId(100L);

        AssignWorkspaceAmenitiesDto dto = new AssignWorkspaceAmenitiesDto();
        dto.setAmenities(List.of(item1, item2));

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(amenityRepository.findById(100L)).thenReturn(Optional.of(wifiAmenity));

        assertThatThrownBy(() -> workspaceAmenityService.syncWorkspaceAmenities(1L, 10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("trùng lặp trong yêu cầu");
    }

    @Test
    @DisplayName("syncWorkspaceAmenities: Tiện ích bị vô hiệu hóa ném BadRequestException")
    void syncWorkspaceAmenities_InactiveAmenity_ThrowsBadRequestException() {
        wifiAmenity.setActive(false);

        AssignAmenityItemDto item = new AssignAmenityItemDto();
        item.setAmenityId(100L);

        AssignWorkspaceAmenitiesDto dto = new AssignWorkspaceAmenitiesDto();
        dto.setAmenities(List.of(item));

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(amenityRepository.findById(100L)).thenReturn(Optional.of(wifiAmenity));

        assertThatThrownBy(() -> workspaceAmenityService.syncWorkspaceAmenities(1L, 10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("hiện đang bị vô hiệu hóa");
    }

    @Test
    @DisplayName("syncWorkspaceAmenities: Phụ thu âm ném BadRequestException")
    void syncWorkspaceAmenities_NegativePrice_ThrowsBadRequestException() {
        AssignAmenityItemDto item = new AssignAmenityItemDto();
        item.setAmenityId(100L);
        item.setAddonPricePerHour(new BigDecimal("-1000"));

        AssignWorkspaceAmenitiesDto dto = new AssignWorkspaceAmenitiesDto();
        dto.setAmenities(List.of(item));

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(amenityRepository.findById(100L)).thenReturn(Optional.of(wifiAmenity));

        assertThatThrownBy(() -> workspaceAmenityService.syncWorkspaceAmenities(1L, 10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Phụ thu theo giờ không được là số âm");
    }

    @Test
    @DisplayName("addAmenityToWorkspace: Tiện ích đã tồn tại ném ConflictException")
    void addAmenityToWorkspace_AlreadyExists_ThrowsConflictException() {
        AssignAmenityItemDto dto = new AssignAmenityItemDto();
        dto.setAmenityId(100L);

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(workspaceAmenityRepository.existsByWorkspaceIdAndAmenityIdAndResourceIsNull(1L, 100L)).thenReturn(true);

        assertThatThrownBy(() -> workspaceAmenityService.addAmenityToWorkspace(1L, 10L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã được gán cho không gian");
    }

    @Test
    @DisplayName("addAmenityToWorkspace: Thành công thêm tiện ích")
    void addAmenityToWorkspace_Success() {
        AssignAmenityItemDto dto = new AssignAmenityItemDto();
        dto.setAmenityId(100L);
        dto.setAddonPricePerHour(BigDecimal.ZERO);

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(workspaceAmenityRepository.existsByWorkspaceIdAndAmenityIdAndResourceIsNull(1L, 100L)).thenReturn(false);
        when(amenityRepository.findById(100L)).thenReturn(Optional.of(wifiAmenity));
        when(workspaceAmenityRepository.save(any(WorkspaceAmenityModel.class))).thenAnswer(inv -> {
            WorkspaceAmenityModel wa = inv.getArgument(0);
            wa.setId(99L);
            return wa;
        });

        WorkspaceAmenityResponseDto result = workspaceAmenityService.addAmenityToWorkspace(1L, 10L, dto);

        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getAmenityId()).isEqualTo(100L);
        assertThat(result.isComplimentary()).isTrue();
    }

    @Test
    @DisplayName("removeAmenityFromWorkspace: Không tìm thấy tiện ích trong không gian ném NotFoundException")
    void removeAmenityFromWorkspace_NotFound_ThrowsNotFoundException() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(workspaceAmenityRepository.findByWorkspaceIdAndAmenityId(1L, 100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workspaceAmenityService.removeAmenityFromWorkspace(1L, 100L, 10L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("không có trong không gian này");
    }

    @Test
    @DisplayName("removeAmenityFromWorkspace: Thành công xóa tiện ích khỏi không gian")
    void removeAmenityFromWorkspace_Success() {
        WorkspaceAmenityModel wa = new WorkspaceAmenityModel();
        wa.setId(50L);

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(workspaceAmenityRepository.findByWorkspaceIdAndAmenityId(1L, 100L)).thenReturn(Optional.of(wa));

        workspaceAmenityService.removeAmenityFromWorkspace(1L, 100L, 10L);

        verify(workspaceAmenityRepository).delete(wa);
    }
}
