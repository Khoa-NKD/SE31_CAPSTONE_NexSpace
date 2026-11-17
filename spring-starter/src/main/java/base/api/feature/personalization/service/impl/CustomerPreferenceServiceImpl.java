package base.api.feature.personalization.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.personalization.dto.request.UpdateCustomerPreferenceDto;
import base.api.feature.personalization.dto.response.CustomerPreferenceDto;
import base.api.feature.personalization.mapper.CustomerPreferenceMapper;
import base.api.feature.personalization.repository.ICustomerPreferenceRepository;
import base.api.feature.personalization.service.ICustomerPreferenceService;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.personalization.CustomerPreferenceModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.enums.ResourceCategoryPreference;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerPreferenceServiceImpl implements ICustomerPreferenceService {

    private final ICustomerPreferenceRepository customerPreferenceRepository;
    private final IUserRepository userRepository;
    private final IAmenityRepository amenityRepository;

    @Override
    public CustomerPreferenceDto getMyPreferences(Long actorId) {
        UserModel user = validateCustomerUser(actorId);
        return customerPreferenceRepository.findByCustomerId(user.getId())
                .map(CustomerPreferenceMapper::toDto)
                .orElseGet(() -> CustomerPreferenceMapper.toEmptyDto(actorId));
    }

    @Override
    @Transactional
    public CustomerPreferenceDto createMyPreferences(Long actorId, UpdateCustomerPreferenceDto dto) {
        UserModel user = validateCustomerUser(actorId);

        // Quy định: Mỗi tài khoản chỉ được thêm tối đa 1 dòng duy nhất vào bảng customer_preference
        if (customerPreferenceRepository.existsById(user.getId())) {
            throw new ConflictException("Khách hàng đã thiết lập sở thích không gian trước đó. Mỗi tài khoản chỉ được có tối đa 1 bản ghi sở thích, vui lòng sử dụng chức năng cập nhật (PUT).");
        }

        return savePreferences(user, dto, true);
    }

    @Override
    @Transactional
    public CustomerPreferenceDto updateMyPreferences(Long actorId, UpdateCustomerPreferenceDto dto) {
        UserModel user = validateCustomerUser(actorId);
        boolean isNew = !customerPreferenceRepository.existsById(user.getId());
        return savePreferences(user, dto, isNew);
    }

    private CustomerPreferenceDto savePreferences(UserModel user, UpdateCustomerPreferenceDto dto, boolean isNew) {
        if (dto == null) {
            throw new BadRequestException("Dữ liệu sở thích không được để trống");
        }

        // 1. Kiểm tra ngân sách (budgetMin <= budgetMax)
        if (dto.getBudgetMin() != null && dto.getBudgetMax() != null) {
            if (dto.getBudgetMin().compareTo(dto.getBudgetMax()) > 0) {
                throw new BadRequestException("Ngân sách tối thiểu không được lớn hơn ngân sách tối đa");
            }
        }

        // 2. Chuẩn hóa & kiểm tra danh sách quận/khu vực (tối đa 5)
        List<String> sanitizedDistricts = null;
        if (dto.getDistricts() != null) {
            sanitizedDistricts = dto.getDistricts().stream()
                    .filter(d -> d != null && !d.isBlank())
                    .map(String::trim)
                    .distinct()
                    .toList();
            if (sanitizedDistricts.size() > 5) {
                throw new BadRequestException("Danh sách khu vực tối đa 5 quận");
            }
        }

        // 3. Kiểm tra điều kiện bắt buộc: Ít nhất 1 khu vực HOẶC 1 loại không gian cụ thể (!= ANY)
        ResourceCategoryPreference category = dto.getResourceCategory() != null ? dto.getResourceCategory() : ResourceCategoryPreference.ANY;
        boolean hasDistricts = sanitizedDistricts != null && !sanitizedDistricts.isEmpty();
        boolean hasSpecificCategory = category != ResourceCategoryPreference.ANY;

        if (!hasDistricts && !hasSpecificCategory) {
            throw new BadRequestException("Vui lòng chọn ít nhất một khu vực (quận) hoặc một loại không gian cụ thể");
        }

        // 4. Chuẩn hóa & kiểm tra tính hợp lệ của tiện ích (Amenity IDs)
        List<Long> sanitizedAmenityIds = null;
        if (dto.getAmenityIds() != null) {
            sanitizedAmenityIds = dto.getAmenityIds().stream()
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            if (sanitizedAmenityIds.size() > 10) {
                throw new BadRequestException("Danh sách tiện ích tối đa 10 tiện ích");
            }
            if (!sanitizedAmenityIds.isEmpty()) {
                List<Long> existingIds = amenityRepository.findAllById(sanitizedAmenityIds).stream()
                        .map(AmenityModel::getId)
                        .toList();
                if (existingIds.size() != sanitizedAmenityIds.size()) {
                    throw new BadRequestException("Một hoặc nhiều tiện ích không tồn tại trong hệ thống");
                }
            }
        }

        // 5. Tìm bản ghi hiện tại hoặc tạo mới với cờ newRecord chính xác
        CustomerPreferenceModel model;
        if (isNew) {
            model = new CustomerPreferenceModel();
            model.setCustomerId(user.getId());
            model.setCustomer(user);
            model.setNewRecord(true);
        } else {
            model = customerPreferenceRepository.findByCustomerId(user.getId())
                    .orElseGet(() -> {
                        CustomerPreferenceModel newModel = new CustomerPreferenceModel();
                        newModel.setCustomerId(user.getId());
                        newModel.setCustomer(user);
                        newModel.setNewRecord(true);
                        return newModel;
                    });
        }

        model.setDistrictsJson(CustomerPreferenceMapper.serializeList(sanitizedDistricts));
        model.setAmenityIdsJson(CustomerPreferenceMapper.serializeList(sanitizedAmenityIds));
        model.setBudgetMin(dto.getBudgetMin());
        model.setBudgetMax(dto.getBudgetMax());
        model.setResourceCategory(category);
        model.setNoiseLevel(dto.getNoiseLevel());
        model.setPurpose(dto.getPurpose());
        model.setUpdatedAt(LocalDateTime.now());

        CustomerPreferenceModel saved = customerPreferenceRepository.save(model);
        log.info("Lưu sở thích không gian thành công cho khách hàng ID: {} (isNew={})", user.getId(), isNew);

        return CustomerPreferenceMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void deleteMyPreferences(Long actorId) {
        UserModel user = validateCustomerUser(actorId);
        customerPreferenceRepository.findByCustomerId(user.getId())
                .ifPresent(customerPreferenceRepository::delete);
        log.info("Đã xóa cấu hình sở thích không gian cho khách hàng ID: {}", actorId);
    }

    private UserModel validateCustomerUser(Long actorId) {
        if (actorId == null) {
            throw new ForbiddenException("Yêu cầu xác thực tài khoản");
        }
        UserModel user = userRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin tài khoản"));

        if (user.getRole() != UserRole.USER) {
            throw new ForbiddenException("Chức năng thiết lập sở thích chỉ áp dụng cho tài khoản Khách hàng (Customer)");
        }
        return user;
    }
}
