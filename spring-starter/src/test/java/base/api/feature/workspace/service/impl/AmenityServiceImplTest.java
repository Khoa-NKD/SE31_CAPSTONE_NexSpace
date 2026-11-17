package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.enums.AmenityCategory;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AmenityServiceImplTest {

    @Mock
    private IAmenityRepository amenityRepository;

    @Mock
    private IWorkspaceAmenityRepository workspaceAmenityRepository;

    @Mock
    private IUserRepository userRepository;

    @Mock
    private IAuditService auditService;

    @InjectMocks
    private AmenityServiceImpl amenityService;

    private UserModel mockAdmin;
    private UserModel mockOrganizer;

    @BeforeEach
    void setUp() {
        mockAdmin = new UserModel();
        mockAdmin.setId(1L);
        mockAdmin.setUserName("admin");

        mockOrganizer = new UserModel();
        mockOrganizer.setId(10L);
        mockOrganizer.setUserName("organizer1");
    }

    @Test
    @DisplayName("Admin tạo tiện ích hệ thống mới thành công")
    void createAmenity_Success() {
        CreateAmenityDto dto = new CreateAmenityDto();
        dto.setName("Wi-Fi 6E");
        dto.setCategory(AmenityCategory.TECH);
        dto.setIcon("Wifi");
        dto.setDescription("High speed Wi-Fi 6E mesh");

        when(amenityRepository.existsByNameIgnoreCaseAndOrganizerIsNull("Wi-Fi 6E")).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockAdmin));
        when(amenityRepository.save(any(AmenityModel.class))).thenAnswer(invocation -> {
            AmenityModel m = invocation.getArgument(0);
            m.setId(100L);
            return m;
        });

        AmenityResponseDto result = amenityService.createAmenity(1L, dto);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getName()).isEqualTo("Wi-Fi 6E");
        assertThat(result.isActive()).isTrue();
        assertThat(result.isCustom()).isFalse();
        verify(auditService).log(eq(mockAdmin), eq("AMENITY"), eq("CREATE"), eq("AmenityModel"), eq(100L), anyString());
    }

    @Test
    @DisplayName("Admin tạo tiện ích hệ thống trùng tên ném ConflictException")
    void createAmenity_DuplicateName_ThrowsConflictException() {
        CreateAmenityDto dto = new CreateAmenityDto();
        dto.setName("Wi-Fi 6E");
        dto.setCategory(AmenityCategory.TECH);

        when(amenityRepository.existsByNameIgnoreCaseAndOrganizerIsNull("Wi-Fi 6E")).thenReturn(true);

        assertThatThrownBy(() -> amenityService.createAmenity(1L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã tồn tại trong hệ thống");
    }

    @Test
    @DisplayName("Admin cập nhật tiện ích hệ thống thành công")
    void updateAmenity_Success() {
        AmenityModel existing = new AmenityModel();
        existing.setId(50L);
        existing.setName("Wi-Fi");
        existing.setCategory(AmenityCategory.TECH);
        existing.setActive(true);

        UpdateAmenityDto dto = new UpdateAmenityDto();
        dto.setName("Wi-Fi 6 (1 Gbps)");
        dto.setCategory(AmenityCategory.TECH);
        dto.setIcon("WifiHigh");
        dto.setDescription("Cập nhật mô tả");
        dto.setActive(true);

        when(amenityRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(amenityRepository.existsByNameIgnoreCaseAndOrganizerIsNullAndIdNot("Wi-Fi 6 (1 Gbps)", 50L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockAdmin));
        when(amenityRepository.save(any(AmenityModel.class))).thenAnswer(inv -> inv.getArgument(0));

        AmenityResponseDto result = amenityService.updateAmenity(1L, 50L, dto);

        assertThat(result.getName()).isEqualTo("Wi-Fi 6 (1 Gbps)");
        assertThat(result.getIcon()).isEqualTo("WifiHigh");
    }

    @Test
    @DisplayName("Cập nhật tiện ích không tồn tại ném NotFoundException")
    void updateAmenity_NotFound_ThrowsNotFoundException() {
        UpdateAmenityDto dto = new UpdateAmenityDto();
        dto.setName("Non-existent");
        dto.setCategory(AmenityCategory.TECH);

        when(amenityRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> amenityService.updateAmenity(1L, 999L, dto))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy tiện ích");
    }

    @Test
    @DisplayName("Lấy danh sách tiện ích hệ thống đang kích hoạt")
    void getActiveAmenities_Success() {
        AmenityModel m1 = new AmenityModel();
        m1.setId(1L);
        m1.setName("Coffee");
        m1.setActive(true);

        AmenityModel m2 = new AmenityModel();
        m2.setId(2L);
        m2.setName("Printer");
        m2.setActive(true);

        when(amenityRepository.findByOrganizerIsNullAndActiveTrueOrderByNameAsc()).thenReturn(List.of(m1, m2));

        List<AmenityResponseDto> results = amenityService.getActiveAmenities();

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getName()).isEqualTo("Coffee");
        assertThat(results.get(1).getName()).isEqualTo("Printer");
    }

    @Test
    @DisplayName("Bật tắt trạng thái tiện ích")
    void toggleAmenityStatus_Success() {
        AmenityModel m = new AmenityModel();
        m.setId(1L);
        m.setActive(true);

        when(amenityRepository.findById(1L)).thenReturn(Optional.of(m));
        when(amenityRepository.save(any(AmenityModel.class))).thenAnswer(inv -> inv.getArgument(0));

        amenityService.toggleAmenityStatus(1L, 1L, false);

        assertThat(m.isActive()).isFalse();
    }

    // ==========================================
    // ORGANIZER CUSTOM AMENITY TESTS
    // ==========================================

    @Test
    @DisplayName("Organizer tạo tiện ích riêng thành công")
    void createOrganizerAmenity_Success() {
        CreateAmenityDto dto = new CreateAmenityDto();
        dto.setName("Trà thảo mộc hữu cơ");
        dto.setCategory(AmenityCategory.COMFORT);
        dto.setIcon("Coffee");
        dto.setDescription("Trà cung cấp tự do tại pantry");

        when(amenityRepository.existsByNameIgnoreCaseAndOrganizerId("Trà thảo mộc hữu cơ", 10L)).thenReturn(false);
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockOrganizer));
        when(amenityRepository.save(any(AmenityModel.class))).thenAnswer(inv -> {
            AmenityModel m = inv.getArgument(0);
            m.setId(201L);
            return m;
        });

        AmenityResponseDto result = amenityService.createOrganizerAmenity(10L, dto);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(201L);
        assertThat(result.getName()).isEqualTo("Trà thảo mộc hữu cơ");
        assertThat(result.isCustom()).isTrue();
        assertThat(result.getOrganizerId()).isEqualTo(10L);
        verify(auditService).log(eq(mockOrganizer), eq("AMENITY"), eq("CREATE_CUSTOM"), eq("AmenityModel"), eq(201L), anyString());
    }

    @Test
    @DisplayName("Organizer tạo tiện ích riêng trùng tên ném ConflictException")
    void createOrganizerAmenity_Duplicate_ThrowsConflictException() {
        CreateAmenityDto dto = new CreateAmenityDto();
        dto.setName("Trà thảo mộc hữu cơ");
        dto.setCategory(AmenityCategory.COMFORT);

        when(amenityRepository.existsByNameIgnoreCaseAndOrganizerId("Trà thảo mộc hữu cơ", 10L)).thenReturn(true);

        assertThatThrownBy(() -> amenityService.createOrganizerAmenity(10L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Bạn đã có tiện ích mang tên");
    }

    @Test
    @DisplayName("Organizer cập nhật tiện ích của organizer khác ném NotFoundException (Strict Ownership)")
    void updateOrganizerAmenity_NotOwner_ThrowsNotFoundException() {
        AmenityModel otherAmenity = new AmenityModel();
        otherAmenity.setId(205L);
        UserModel otherOrganizer = new UserModel();
        otherOrganizer.setId(99L);
        otherAmenity.setOrganizer(otherOrganizer);

        when(amenityRepository.findById(205L)).thenReturn(Optional.of(otherAmenity));

        UpdateAmenityDto dto = new UpdateAmenityDto();
        dto.setName("Hack name");
        dto.setCategory(AmenityCategory.TECH);

        assertThatThrownBy(() -> amenityService.updateOrganizerAmenity(10L, 205L, dto))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy tiện ích");
    }

    @Test
    @DisplayName("Organizer xóa tiện ích đang được sử dụng ném ConflictException")
    void deleteOrganizerAmenity_InUse_ThrowsConflictException() {
        AmenityModel myAmenity = new AmenityModel();
        myAmenity.setId(201L);
        myAmenity.setOrganizer(mockOrganizer);

        when(amenityRepository.findById(201L)).thenReturn(Optional.of(myAmenity));
        when(workspaceAmenityRepository.existsByAmenityId(201L)).thenReturn(true);

        assertThatThrownBy(() -> amenityService.deleteOrganizerAmenity(10L, 201L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đang được gán cho không gian làm việc");
    }

    @Test
    @DisplayName("Organizer xóa tiện ích hợp lệ thành công")
    void deleteOrganizerAmenity_Success() {
        AmenityModel myAmenity = new AmenityModel();
        myAmenity.setId(201L);
        myAmenity.setOrganizer(mockOrganizer);

        when(amenityRepository.findById(201L)).thenReturn(Optional.of(myAmenity));
        when(workspaceAmenityRepository.existsByAmenityId(201L)).thenReturn(false);

        amenityService.deleteOrganizerAmenity(10L, 201L);

        verify(amenityRepository).delete(myAmenity);
    }
}
