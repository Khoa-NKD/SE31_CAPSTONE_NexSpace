package base.api.feature.personalization.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.personalization.dto.request.UpdateCustomerPreferenceDto;
import base.api.feature.personalization.dto.response.CustomerPreferenceDto;
import base.api.feature.personalization.repository.ICustomerPreferenceRepository;
import base.api.feature.personalization.service.impl.CustomerPreferenceServiceImpl;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.personalization.CustomerPreferenceModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.enums.BookingPurpose;
import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategoryPreference;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerPreferenceServiceImplTest {

    @Mock
    private ICustomerPreferenceRepository customerPreferenceRepository;

    @Mock
    private IUserRepository userRepository;

    @Mock
    private IAmenityRepository amenityRepository;

    @InjectMocks
    private CustomerPreferenceServiceImpl customerPreferenceService;

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
    @DisplayName("getMyPreferences - Trả về DTO rỗng mặc định khi chưa có dữ liệu trong DB, không insert ngầm")
    void getMyPreferences_whenNoRecord_shouldReturnEmptyDtoWithoutSaving() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(customerPreferenceRepository.findByCustomerId(10L)).thenReturn(Optional.empty());

        CustomerPreferenceDto result = customerPreferenceService.getMyPreferences(10L);

        assertThat(result).isNotNull();
        assertThat(result.getCustomerId()).isEqualTo(10L);
        assertThat(result.getDistricts()).isEmpty();
        assertThat(result.getAmenityIds()).isEmpty();
        assertThat(result.getResourceCategory()).isEqualTo(ResourceCategoryPreference.ANY);
        assertThat(result.getBudgetMin()).isNull();
        assertThat(result.getBudgetMax()).isNull();

        verify(customerPreferenceRepository, never()).save(any());
    }

    @Test
    @DisplayName("getMyPreferences - Trả về dữ liệu sở thích khi đã tồn tại bản ghi trong DB")
    void getMyPreferences_whenRecordExists_shouldReturnMappedDto() {
        CustomerPreferenceModel model = new CustomerPreferenceModel();
        model.setCustomerId(10L);
        model.setCustomer(customerUser);
        model.setDistrictsJson("[\"Hải Châu\", \"Sơn Trà\"]");
        model.setAmenityIdsJson("[1, 2]");
        model.setBudgetMin(BigDecimal.valueOf(50000));
        model.setBudgetMax(BigDecimal.valueOf(150000));
        model.setResourceCategory(ResourceCategoryPreference.DESK);
        model.setNoiseLevel(NoiseLevel.QUIET);
        model.setPurpose(BookingPurpose.STUDY);

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(customerPreferenceRepository.findByCustomerId(10L)).thenReturn(Optional.of(model));

        CustomerPreferenceDto result = customerPreferenceService.getMyPreferences(10L);

        assertThat(result).isNotNull();
        assertThat(result.getCustomerId()).isEqualTo(10L);
        assertThat(result.getDistricts()).containsExactly("Hải Châu", "Sơn Trà");
        assertThat(result.getAmenityIds()).containsExactly(1L, 2L);
        assertThat(result.getBudgetMin()).isEqualByComparingTo(BigDecimal.valueOf(50000));
        assertThat(result.getBudgetMax()).isEqualByComparingTo(BigDecimal.valueOf(150000));
        assertThat(result.getResourceCategory()).isEqualTo(ResourceCategoryPreference.DESK);
        assertThat(result.getNoiseLevel()).isEqualTo(NoiseLevel.QUIET);
        assertThat(result.getPurpose()).isEqualTo(BookingPurpose.STUDY);
    }

    @Test
    @DisplayName("getMyPreferences - Ném ForbiddenException khi người dùng không phải role USER")
    void getMyPreferences_whenRoleNotUser_shouldThrowForbidden() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(organizerUser));

        assertThatThrownBy(() -> customerPreferenceService.getMyPreferences(20L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Chức năng thiết lập sở thích chỉ áp dụng cho tài khoản Khách hàng");
    }

    @Test
    @DisplayName("createMyPreferences - Thiết lập mới thành công khi chưa có bản ghi")
    void createMyPreferences_success_whenNoExistingRecord() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .resourceCategory(ResourceCategoryPreference.DESK)
                .purpose(BookingPurpose.FREELANCE)
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(customerPreferenceRepository.existsById(10L)).thenReturn(false);
        when(customerPreferenceRepository.save(any(CustomerPreferenceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerPreferenceDto result = customerPreferenceService.createMyPreferences(10L, dto);

        assertThat(result).isNotNull();
        assertThat(result.getCustomerId()).isEqualTo(10L);
        assertThat(result.getDistricts()).containsExactly("Hải Châu");
        verify(customerPreferenceRepository).save(any(CustomerPreferenceModel.class));
    }

    @Test
    @DisplayName("createMyPreferences - Ném ConflictException khi tài khoản đã có sẵn 1 bản ghi sở thích")
    void createMyPreferences_shouldThrowConflict_whenRecordAlreadyExists() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(customerPreferenceRepository.existsById(10L)).thenReturn(true);

        assertThatThrownBy(() -> customerPreferenceService.createMyPreferences(10L, dto))
                .isInstanceOf(base.api.shared.exception.ConflictException.class)
                .hasMessageContaining("Mỗi tài khoản chỉ được có tối đa 1 bản ghi sở thích");

        verify(customerPreferenceRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateMyPreferences - Cập nhật thành công khi dữ liệu hợp lệ")
    void updateMyPreferences_success_whenValidInputs() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu", "Thanh Khê"))
                .amenityIds(List.of(1L, 2L))
                .budgetMin(BigDecimal.valueOf(60000))
                .budgetMax(BigDecimal.valueOf(180000))
                .resourceCategory(ResourceCategoryPreference.DESK)
                .noiseLevel(NoiseLevel.MODERATE)
                .purpose(BookingPurpose.TEAM_WORK)
                .build();

        AmenityModel amenity1 = new AmenityModel();
        amenity1.setId(1L);
        AmenityModel amenity2 = new AmenityModel();
        amenity2.setId(2L);

        CustomerPreferenceModel existingModel = new CustomerPreferenceModel();
        existingModel.setCustomerId(10L);
        existingModel.setCustomer(customerUser);

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(amenityRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(amenity1, amenity2));
        when(customerPreferenceRepository.existsById(10L)).thenReturn(true);
        when(customerPreferenceRepository.findByCustomerId(10L)).thenReturn(Optional.of(existingModel));
        when(customerPreferenceRepository.save(any(CustomerPreferenceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerPreferenceDto result = customerPreferenceService.updateMyPreferences(10L, dto);

        assertThat(result).isNotNull();
        assertThat(result.getDistricts()).containsExactly("Hải Châu", "Thanh Khê");
        assertThat(result.getAmenityIds()).containsExactly(1L, 2L);
        assertThat(result.getBudgetMin()).isEqualByComparingTo(BigDecimal.valueOf(60000));
        assertThat(result.getBudgetMax()).isEqualByComparingTo(BigDecimal.valueOf(180000));
        assertThat(result.getResourceCategory()).isEqualTo(ResourceCategoryPreference.DESK);

        ArgumentCaptor<CustomerPreferenceModel> captor = ArgumentCaptor.forClass(CustomerPreferenceModel.class);
        verify(customerPreferenceRepository).save(captor.capture());
        CustomerPreferenceModel savedModel = captor.getValue();
        assertThat(savedModel.getCustomerId()).isEqualTo(10L);
        assertThat(savedModel.getDistrictsJson()).isEqualTo("[\"Hải Châu\",\"Thanh Khê\"]");
        assertThat(savedModel.getAmenityIdsJson()).isEqualTo("[1,2]");
    }

    @Test
    @DisplayName("updateMyPreferences - Ném BadRequestException khi budgetMin > budgetMax")
    void updateMyPreferences_shouldThrowBadRequest_whenBudgetMinGreaterThanBudgetMax() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .budgetMin(BigDecimal.valueOf(200000))
                .budgetMax(BigDecimal.valueOf(100000))
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));

        assertThatThrownBy(() -> customerPreferenceService.updateMyPreferences(10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Ngân sách tối thiểu không được lớn hơn ngân sách tối đa");
    }

    @Test
    @DisplayName("updateMyPreferences - Ném BadRequestException khi không chọn quận nào và loại không gian là ANY")
    void updateMyPreferences_shouldThrowBadRequest_whenNoDistrictAndCategoryIsAny() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of())
                .resourceCategory(ResourceCategoryPreference.ANY)
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));

        assertThatThrownBy(() -> customerPreferenceService.updateMyPreferences(10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng chọn ít nhất một khu vực (quận) hoặc một loại không gian cụ thể");
    }

    @Test
    @DisplayName("updateMyPreferences - Ném BadRequestException khi có ID tiện ích không tồn tại trong DB")
    void updateMyPreferences_shouldThrowBadRequest_whenAmenityDoesNotExist() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .amenityIds(List.of(1L, 999L))
                .build();

        AmenityModel amenity1 = new AmenityModel();
        amenity1.setId(1L);

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(amenityRepository.findAllById(List.of(1L, 999L))).thenReturn(List.of(amenity1)); // Chỉ có 1 amenity

        assertThatThrownBy(() -> customerPreferenceService.updateMyPreferences(10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Một hoặc nhiều tiện ích không tồn tại trong hệ thống");
    }

    @Test
    @DisplayName("updateMyPreferences - Ném BadRequestException khi số lượng quận vượt quá 5")
    void updateMyPreferences_shouldThrowBadRequest_whenDistrictsExceedLimit() {
        UpdateCustomerPreferenceDto dto = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Q1", "Q2", "Q3", "Q4", "Q5", "Q6"))
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));

        assertThatThrownBy(() -> customerPreferenceService.updateMyPreferences(10L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Danh sách khu vực tối đa 5 quận");
    }

    @Test
    @DisplayName("deleteMyPreferences - Xóa bản ghi thành công khi tồn tại")
    void deleteMyPreferences_success_whenRecordExists() {
        CustomerPreferenceModel model = new CustomerPreferenceModel();
        model.setCustomerId(10L);

        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(customerPreferenceRepository.findByCustomerId(10L)).thenReturn(Optional.of(model));

        customerPreferenceService.deleteMyPreferences(10L);

        verify(customerPreferenceRepository).delete(model);
    }

    @Test
    @DisplayName("deleteMyPreferences - Ném ForbiddenException khi người dùng không phải USER")
    void deleteMyPreferences_whenRoleNotUser_shouldThrowForbidden() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(organizerUser));

        assertThatThrownBy(() -> customerPreferenceService.deleteMyPreferences(20L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Chức năng thiết lập sở thích chỉ áp dụng cho tài khoản Khách hàng");

        verify(customerPreferenceRepository, never()).delete(any());
    }
}

