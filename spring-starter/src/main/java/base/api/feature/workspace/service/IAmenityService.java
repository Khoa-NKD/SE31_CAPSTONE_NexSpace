package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.AmenityFilterDto;
import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import org.springframework.data.domain.Page;

import java.util.List;

public interface IAmenityService {

    AmenityResponseDto createAmenity(Long actorId, CreateAmenityDto dto);

    AmenityResponseDto updateAmenity(Long actorId, Long amenityId, UpdateAmenityDto dto);

    void toggleAmenityStatus(Long actorId, Long amenityId, boolean active);

    List<AmenityResponseDto> getActiveAmenities();

    AmenityResponseDto getAmenityById(Long amenityId);

    Page<AmenityResponseDto> listAmenities(AmenityFilterDto filter);

    void deleteAmenity(Long actorId, Long amenityId);

    // ==========================================
    // ORGANIZER CUSTOM AMENITY MANAGEMENT
    // ==========================================

    AmenityResponseDto createOrganizerAmenity(Long organizerId, CreateAmenityDto dto);

    AmenityResponseDto updateOrganizerAmenity(Long organizerId, Long amenityId, UpdateAmenityDto dto);

    void toggleOrganizerAmenityStatus(Long organizerId, Long amenityId, boolean active);

    void deleteOrganizerAmenity(Long organizerId, Long amenityId);

    List<AmenityResponseDto> getAvailableAmenitiesForOrganizer(Long organizerId);

    Page<AmenityResponseDto> listOrganizerAmenities(Long organizerId, AmenityFilterDto filter);
}
