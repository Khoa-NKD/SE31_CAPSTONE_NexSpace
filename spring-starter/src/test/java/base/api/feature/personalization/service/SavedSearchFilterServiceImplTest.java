package base.api.feature.personalization.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.personalization.dto.request.CreateSavedSearchFilterDto;
import base.api.feature.personalization.dto.request.SavedSearchFilterCriteriaDto;
import base.api.feature.personalization.dto.response.SavedSearchFilterDto;
import base.api.feature.personalization.repository.ISavedSearchFilterRepository;
import base.api.feature.personalization.service.impl.SavedSearchFilterServiceImpl;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.personalization.SavedSearchFilterModel;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavedSearchFilterServiceImplTest {

    @Mock
    private ISavedSearchFilterRepository savedSearchFilterRepository;

    @Mock
    private IUserRepository userRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private SavedSearchFilterServiceImpl savedSearchFilterService;

    private UserModel customerUser;
    private UserModel organizerUser;

    @BeforeEach
    void setUp() {
        RoleModel userRole = new RoleModel();
        userRole.setId(1L);
        userRole.setName("USER");

        RoleModel orgRole = new RoleModel();
        orgRole.setId(2L);
        orgRole.setName("ORGANIZER");

        customerUser = new UserModel();
        customerUser.setId(10L);
        customerUser.setRoleEntity(userRole);

        organizerUser = new UserModel();
        organizerUser.setId(20L);
        organizerUser.setRoleEntity(orgRole);
    }

    @Test
    @DisplayName("getMySavedFilters: Trả về danh sách bộ lọc đã lưu của khách hàng")
    void getMySavedFilters_Success() {
        SavedSearchFilterModel model = new SavedSearchFilterModel();
        model.setId(100L);
        model.setCustomer(customerUser);
        model.setName("Phòng họp Q1");
        model.setCriteriaJson("{\"city\":\"Hồ Chí Minh\",\"district\":\"Quận 1\",\"minPrice\":100000}");
        model.setCreatedAt(LocalDateTime.now());

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(savedSearchFilterRepository.findByCustomerIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(model));

        List<SavedSearchFilterDto> result = savedSearchFilterService.getMySavedFilters(10L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Phòng họp Q1");
        assertThat(result.get(0).getCriteria()).isNotNull();
        assertThat(result.get(0).getCriteria().getDistrict()).isEqualTo("Quận 1");
    }

    @Test
    @DisplayName("getMySavedFilters: Thất bại khi người dùng không phải khách hàng (CUSTOMER)")
    void getMySavedFilters_Forbidden_WhenNotCustomer() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(organizerUser));

        assertThatThrownBy(() -> savedSearchFilterService.getMySavedFilters(20L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("chỉ áp dụng cho tài khoản Khách hàng");
    }

    @Test
    @DisplayName("createSavedFilter: Thành công tạo mới bộ lọc")
    void createSavedFilter_Success() {
        SavedSearchFilterCriteriaDto criteria = SavedSearchFilterCriteriaDto.builder()
                .city("Hồ Chí Minh")
                .district("Quận 1")
                .minPrice(BigDecimal.valueOf(50000))
                .build();

        CreateSavedSearchFilterDto request = CreateSavedSearchFilterDto.builder()
                .name("Chỗ ngồi yên tĩnh")
                .criteria(criteria)
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(savedSearchFilterRepository.existsByCustomerIdAndName(10L, "Chỗ ngồi yên tĩnh")).thenReturn(false);
        when(savedSearchFilterRepository.countByCustomerId(10L)).thenReturn(2L);

        SavedSearchFilterModel savedModel = new SavedSearchFilterModel();
        savedModel.setId(201L);
        savedModel.setCustomer(customerUser);
        savedModel.setName("Chỗ ngồi yên tĩnh");
        savedModel.setCriteriaJson("{\"city\":\"Hồ Chí Minh\",\"district\":\"Quận 1\",\"minPrice\":50000}");
        savedModel.setCreatedAt(LocalDateTime.now());

        when(savedSearchFilterRepository.save(any(SavedSearchFilterModel.class))).thenReturn(savedModel);

        SavedSearchFilterDto result = savedSearchFilterService.createSavedFilter(10L, request);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(201L);
        assertThat(result.getName()).isEqualTo("Chỗ ngồi yên tĩnh");
        verify(savedSearchFilterRepository).save(any(SavedSearchFilterModel.class));
    }

    @Test
    @DisplayName("createSavedFilter: Thất bại khi trùng tên bộ lọc")
    void createSavedFilter_Conflict_WhenDuplicateName() {
        CreateSavedSearchFilterDto request = CreateSavedSearchFilterDto.builder()
                .name("Đã tồn tại")
                .criteria(new SavedSearchFilterCriteriaDto())
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(savedSearchFilterRepository.existsByCustomerIdAndName(10L, "Đã tồn tại")).thenReturn(true);

        assertThatThrownBy(() -> savedSearchFilterService.createSavedFilter(10L, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Bạn đã có một bộ lọc đã lưu với tên");
    }

    @Test
    @DisplayName("createSavedFilter: Thất bại khi vượt quá giới hạn 20 bộ lọc")
    void createSavedFilter_BadRequest_WhenExceedMaxLimit() {
        CreateSavedSearchFilterDto request = CreateSavedSearchFilterDto.builder()
                .name("Bộ lọc thứ 21")
                .criteria(new SavedSearchFilterCriteriaDto())
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(savedSearchFilterRepository.existsByCustomerIdAndName(10L, "Bộ lọc thứ 21")).thenReturn(false);
        when(savedSearchFilterRepository.countByCustomerId(10L)).thenReturn(20L);

        assertThatThrownBy(() -> savedSearchFilterService.createSavedFilter(10L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("tối đa 20 bộ lọc tìm kiếm");
    }

    @Test
    @DisplayName("deleteSavedFilter: Xóa thành công bộ lọc")
    void deleteSavedFilter_Success() {
        SavedSearchFilterModel model = new SavedSearchFilterModel();
        model.setId(301L);
        model.setCustomer(customerUser);

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(savedSearchFilterRepository.findByIdAndCustomerId(301L, 10L)).thenReturn(Optional.of(model));

        savedSearchFilterService.deleteSavedFilter(10L, 301L);

        verify(savedSearchFilterRepository).delete(model);
    }

    @Test
    @DisplayName("deleteSavedFilter: Thất bại khi không tìm thấy bộ lọc thuộc user")
    void deleteSavedFilter_NotFound() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(savedSearchFilterRepository.findByIdAndCustomerId(999L, 10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> savedSearchFilterService.deleteSavedFilter(10L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy bộ lọc tìm kiếm");
    }
}

