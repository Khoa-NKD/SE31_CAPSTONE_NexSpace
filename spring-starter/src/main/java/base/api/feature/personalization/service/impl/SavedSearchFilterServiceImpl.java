package base.api.feature.personalization.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.personalization.dto.request.CreateSavedSearchFilterDto;
import base.api.feature.personalization.dto.request.SavedSearchFilterCriteriaDto;
import base.api.feature.personalization.dto.response.SavedSearchFilterDto;
import base.api.feature.personalization.repository.ISavedSearchFilterRepository;
import base.api.feature.personalization.service.ISavedSearchFilterService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.personalization.SavedSearchFilterModel;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SavedSearchFilterServiceImpl implements ISavedSearchFilterService {

    private static final int MAX_SAVED_FILTERS_PER_USER = 20;

    private final ISavedSearchFilterRepository savedSearchFilterRepository;
    private final IUserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    public List<SavedSearchFilterDto> getMySavedFilters(Long customerId) {
        UserModel user = validateCustomerUser(customerId);
        List<SavedSearchFilterModel> models = savedSearchFilterRepository.findByCustomerIdOrderByCreatedAtDesc(user.getId());
        return models.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SavedSearchFilterDto createSavedFilter(Long customerId, CreateSavedSearchFilterDto request) {
        UserModel user = validateCustomerUser(customerId);

        String trimmedName = request.getName() != null ? request.getName().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new BadRequestException("Tên bộ lọc không được để trống");
        }

        if (savedSearchFilterRepository.existsByCustomerIdAndName(user.getId(), trimmedName)) {
            throw new ConflictException("Bạn đã có một bộ lọc đã lưu với tên '" + trimmedName + "'");
        }

        long currentCount = savedSearchFilterRepository.countByCustomerId(user.getId());
        if (currentCount >= MAX_SAVED_FILTERS_PER_USER) {
            throw new BadRequestException("Bạn chỉ có thể lưu tối đa " + MAX_SAVED_FILTERS_PER_USER + " bộ lọc tìm kiếm");
        }

        String criteriaJson;
        try {
            criteriaJson = objectMapper.writeValueAsString(request.getCriteria() != null
                    ? request.getCriteria()
                    : new SavedSearchFilterCriteriaDto());
        } catch (JsonProcessingException e) {
            log.error("Lỗi khi tuần tự hóa tiêu chí tìm kiếm sang JSON: {}", e.getMessage());
            throw new BadRequestException("Không thể xử lý dữ liệu tiêu chí tìm kiếm");
        }

        SavedSearchFilterModel model = new SavedSearchFilterModel();
        model.setCustomer(user);
        model.setName(trimmedName);
        model.setCriteriaJson(criteriaJson);

        SavedSearchFilterModel saved = savedSearchFilterRepository.save(model);
        log.info("Khách hàng ID: {} đã lưu bộ lọc tìm kiếm mới với ID: {}", user.getId(), saved.getId());

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteSavedFilter(Long customerId, Long filterId) {
        UserModel user = validateCustomerUser(customerId);

        SavedSearchFilterModel model = savedSearchFilterRepository.findByIdAndCustomerId(filterId, user.getId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bộ lọc tìm kiếm hoặc bạn không có quyền thao tác"));

        savedSearchFilterRepository.delete(model);
        log.info("Khách hàng ID: {} đã xóa bộ lọc tìm kiếm ID: {}", user.getId(), filterId);
    }

    private SavedSearchFilterDto toDto(SavedSearchFilterModel model) {
        SavedSearchFilterCriteriaDto criteria = null;
        if (model.getCriteriaJson() != null && !model.getCriteriaJson().isBlank()) {
            try {
                criteria = objectMapper.readValue(model.getCriteriaJson(), SavedSearchFilterCriteriaDto.class);
            } catch (JsonProcessingException e) {
                log.warn("Không thể giải mã criteria_json cho bộ lọc ID: {}, dùng giá trị mặc định", model.getId());
                criteria = new SavedSearchFilterCriteriaDto();
            }
        }

        return SavedSearchFilterDto.builder()
                .id(model.getId())
                .name(model.getName())
                .criteria(criteria)
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    private UserModel validateCustomerUser(Long actorId) {
        if (actorId == null) {
            throw new ForbiddenException("Yêu cầu xác thực tài khoản");
        }
        UserModel user = userRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin tài khoản"));

        if (user.getRole() != UserRole.USER) {
            throw new ForbiddenException("Chức năng lưu bộ lọc chỉ áp dụng cho tài khoản Khách hàng (Customer)");
        }
        return user;
    }
}

