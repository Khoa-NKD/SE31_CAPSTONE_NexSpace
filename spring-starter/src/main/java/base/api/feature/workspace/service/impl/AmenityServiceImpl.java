package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.workspace.dto.request.AmenityFilterDto;
import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.mapper.AmenityMapper;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.service.IAmenityService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AmenityServiceImpl implements IAmenityService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "name", "category", "active", "createdAt", "updatedAt"
    );

    private final IAmenityRepository amenityRepository;
    private final IUserRepository userRepository;
    private final IAuditService auditService;

    @Override
    @Transactional
    public AmenityResponseDto createAmenity(Long actorId, CreateAmenityDto dto) {
        String trimmedName = dto.getName().trim();
        if (amenityRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new ConflictException("Tên tiện ích '" + trimmedName + "' đã tồn tại trong hệ thống");
        }

        UserModel actor = userRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin người dùng"));

        AmenityModel amenity = new AmenityModel();
        amenity.setName(trimmedName);
        amenity.setCategory(dto.getCategory());
        amenity.setIcon(dto.getIcon());
        amenity.setDescription(dto.getDescription());
        amenity.setActive(true);

        AmenityModel saved = amenityRepository.save(amenity);
        auditService.log(
                actor,
                "AMENITY",
                "CREATE",
                "AmenityModel",
                saved.getId(),
                "Tạo tiện ích mới: " + saved.getName()
        );

        return AmenityMapper.toResponseDto(saved);
    }

    @Override
    @Transactional
    public AmenityResponseDto updateAmenity(Long actorId, Long amenityId, UpdateAmenityDto dto) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));

        String trimmedName = dto.getName().trim();
        if (amenityRepository.existsByNameIgnoreCaseAndIdNot(trimmedName, amenityId)) {
            throw new ConflictException("Tên tiện ích '" + trimmedName + "' đã được sử dụng bởi tiện ích khác");
        }

        UserModel actor = userRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin người dùng"));

        amenity.setName(trimmedName);
        amenity.setCategory(dto.getCategory());
        amenity.setIcon(dto.getIcon());
        amenity.setDescription(dto.getDescription());
        if (dto.getActive() != null) {
            amenity.setActive(dto.getActive());
        }

        AmenityModel saved = amenityRepository.save(amenity);
        auditService.log(
                actor,
                "AMENITY",
                "UPDATE",
                "AmenityModel",
                saved.getId(),
                "Cập nhật tiện ích: " + saved.getName()
        );

        return AmenityMapper.toResponseDto(saved);
    }

    @Override
    @Transactional
    public void toggleAmenityStatus(Long actorId, Long amenityId, boolean active) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));
        amenity.setActive(active);
        amenityRepository.save(amenity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmenityResponseDto> getActiveAmenities() {
        return amenityRepository.findByActiveTrueOrderByNameAsc()
                .stream()
                .map(AmenityMapper::toResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AmenityResponseDto getAmenityById(Long amenityId) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));
        return AmenityMapper.toResponseDto(amenity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AmenityResponseDto> listAmenities(AmenityFilterDto filter) {
        Pageable pageable = filter.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS);
        return amenityRepository.findFiltered(
                filter.getCategory(),
                filter.getActive(),
                filter.normalizedSearch(),
                pageable
        ).map(AmenityMapper::toResponseDto);
    }

    @Override
    @Transactional
    public void deleteAmenity(Long actorId, Long amenityId) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));
        amenityRepository.delete(amenity);
    }
}
