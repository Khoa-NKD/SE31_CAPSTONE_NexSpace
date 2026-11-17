package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.workspace.dto.request.AmenityFilterDto;
import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.mapper.AmenityMapper;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
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
    private final IWorkspaceAmenityRepository workspaceAmenityRepository;
    private final IUserRepository userRepository;
    private final IAuditService auditService;

    @Override
    @Transactional
    public AmenityResponseDto createAmenity(Long actorId, CreateAmenityDto dto) {
        String trimmedName = dto.getName().trim();
        if (amenityRepository.existsByNameIgnoreCaseAndOrganizerIsNull(trimmedName)) {
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
        amenity.setOrganizer(null);

        AmenityModel saved = amenityRepository.save(amenity);
        auditService.log(
                actor,
                "AMENITY",
                "CREATE",
                "AmenityModel",
                saved.getId(),
                "Tạo tiện ích hệ thống mới: " + saved.getName()
        );

        return AmenityMapper.toResponseDto(saved);
    }

    @Override
    @Transactional
    public AmenityResponseDto updateAmenity(Long actorId, Long amenityId, UpdateAmenityDto dto) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));

        String trimmedName = dto.getName().trim();
        if (amenityRepository.existsByNameIgnoreCaseAndOrganizerIsNullAndIdNot(trimmedName, amenityId)) {
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
                "Cập nhật tiện ích hệ thống: " + saved.getName()
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
        return amenityRepository.findByOrganizerIsNullAndActiveTrueOrderByNameAsc()
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
        if (workspaceAmenityRepository.existsByAmenityId(amenityId)) {
            throw new ConflictException("Tiện ích đang được sử dụng trong không gian làm việc, không thể xóa");
        }
        amenityRepository.delete(amenity);
    }

    // ==========================================
    // ORGANIZER CUSTOM AMENITY MANAGEMENT
    // ==========================================

    @Override
    @Transactional
    public AmenityResponseDto createOrganizerAmenity(Long organizerId, CreateAmenityDto dto) {
        String trimmedName = dto.getName().trim();
        if (amenityRepository.existsByNameIgnoreCaseAndOrganizerId(trimmedName, organizerId)) {
            throw new ConflictException("Bạn đã có tiện ích mang tên '" + trimmedName + "' trong danh mục của mình");
        }

        UserModel organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin đối tác"));

        AmenityModel amenity = new AmenityModel();
        amenity.setName(trimmedName);
        amenity.setCategory(dto.getCategory());
        amenity.setIcon(dto.getIcon());
        amenity.setDescription(dto.getDescription());
        amenity.setActive(true);
        amenity.setOrganizer(organizer);

        AmenityModel saved = amenityRepository.save(amenity);
        auditService.log(
                organizer,
                "AMENITY",
                "CREATE_CUSTOM",
                "AmenityModel",
                saved.getId(),
                "Đối tác tạo tiện ích riêng: " + saved.getName()
        );

        return AmenityMapper.toResponseDto(saved);
    }

    @Override
    @Transactional
    public AmenityResponseDto updateOrganizerAmenity(Long organizerId, Long amenityId, UpdateAmenityDto dto) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));

        // Strict Ownership Defense
        if (amenity.getOrganizer() == null || !amenity.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId);
        }

        String trimmedName = dto.getName().trim();
        if (amenityRepository.existsByNameIgnoreCaseAndOrganizerIdAndIdNot(trimmedName, organizerId, amenityId)) {
            throw new ConflictException("Tên tiện ích '" + trimmedName + "' đã được sử dụng bởi tiện ích khác của bạn");
        }

        UserModel organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin đối tác"));

        amenity.setName(trimmedName);
        amenity.setCategory(dto.getCategory());
        amenity.setIcon(dto.getIcon());
        amenity.setDescription(dto.getDescription());
        if (dto.getActive() != null) {
            amenity.setActive(dto.getActive());
        }

        AmenityModel saved = amenityRepository.save(amenity);
        auditService.log(
                organizer,
                "AMENITY",
                "UPDATE_CUSTOM",
                "AmenityModel",
                saved.getId(),
                "Đối tác cập nhật tiện ích riêng: " + saved.getName()
        );

        return AmenityMapper.toResponseDto(saved);
    }

    @Override
    @Transactional
    public void toggleOrganizerAmenityStatus(Long organizerId, Long amenityId, boolean active) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));

        if (amenity.getOrganizer() == null || !amenity.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId);
        }

        amenity.setActive(active);
        amenityRepository.save(amenity);
    }

    @Override
    @Transactional
    public void deleteOrganizerAmenity(Long organizerId, Long amenityId) {
        AmenityModel amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId));

        if (amenity.getOrganizer() == null || !amenity.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy tiện ích với ID: " + amenityId);
        }

        if (workspaceAmenityRepository.existsByAmenityId(amenityId)) {
            throw new ConflictException("Tiện ích đang được gán cho không gian làm việc của bạn, vui lòng gỡ bỏ trước khi xóa");
        }

        amenityRepository.delete(amenity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmenityResponseDto> getAvailableAmenitiesForOrganizer(Long organizerId) {
        return amenityRepository.findAvailableForOrganizer(organizerId)
                .stream()
                .map(AmenityMapper::toResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AmenityResponseDto> listOrganizerAmenities(Long organizerId, AmenityFilterDto filter) {
        Pageable pageable = filter.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS);
        return amenityRepository.findByOrganizerFiltered(
                organizerId,
                filter.getCategory(),
                filter.getActive(),
                filter.normalizedSearch(),
                pageable
        ).map(AmenityMapper::toResponseDto);
    }
}
