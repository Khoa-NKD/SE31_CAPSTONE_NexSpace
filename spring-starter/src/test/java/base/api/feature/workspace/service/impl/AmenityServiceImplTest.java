package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.repository.IAmenityRepository;
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
    private IUserRepository userRepository;

    @Mock
    private IAuditService auditService;

    @InjectMocks
    private AmenityServiceImpl amenityService;

    private UserModel mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new UserModel();
        mockUser.setId(1L);
        mockUser.setUserName("admin");
    }

    @Test
    @DisplayName("Tạo tiện ích mới thành công")
    void createAmenity_Success() {
        CreateAmenityDto dto = new CreateAmenityDto();
        dto.setName("Wi-Fi 6E");
        dto.setCategory(AmenityCategory.TECH);
        dto.setIcon("Wifi");
        dto.setDescription("High speed Wi-Fi 6E mesh");

        when(amenityRepository.existsByNameIgnoreCase("Wi-Fi 6E")).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
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
        verify(auditService).log(eq(mockUser), eq("AMENITY"), eq("CREATE"), eq("AmenityModel"), eq(100L), anyString());
    }

    @Test
    @DisplayName("Tạo tiện ích trùng tên ném ConflictException")
    void createAmenity_DuplicateName_ThrowsConflictException() {
        CreateAmenityDto dto = new CreateAmenityDto();
        dto.setName("Wi-Fi 6E");
        dto.setCategory(AmenityCategory.TECH);

        when(amenityRepository.existsByNameIgnoreCase("Wi-Fi 6E")).thenReturn(true);

        assertThatThrownBy(() -> amenityService.createAmenity(1L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã tồn tại trong hệ thống");
    }

    @Test
    @DisplayName("Cập nhật tiện ích thành công")
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
        when(amenityRepository.existsByNameIgnoreCaseAndIdNot("Wi-Fi 6 (1 Gbps)", 50L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
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
    @DisplayName("Lấy danh sách tiện ích đang kích hoạt")
    void getActiveAmenities_Success() {
        AmenityModel m1 = new AmenityModel();
        m1.setId(1L);
        m1.setName("Coffee");
        m1.setActive(true);

        AmenityModel m2 = new AmenityModel();
        m2.setId(2L);
        m2.setName("Printer");
        m2.setActive(true);

        when(amenityRepository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(m1, m2));

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
}
