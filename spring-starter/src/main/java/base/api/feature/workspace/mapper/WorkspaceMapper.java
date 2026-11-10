package base.api.feature.workspace.mapper;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceStatus;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

public final class WorkspaceMapper {

    private WorkspaceMapper() {
    }

    public static WorkspaceModel toModel(CreateWorkspaceDto dto, UserModel organizer) {
        if (dto == null) {
            return null;
        }

        WorkspaceModel model = new WorkspaceModel();
        model.setOrganizer(organizer);
        model.setName(dto.getName());
        model.setCategory(dto.getCategory());
        model.setDescription(dto.getDescription());
        model.setAddress(dto.getAddress());
        model.setDistrict(dto.getDistrict());
        model.setCity(dto.getCity());
        model.setLatitude(dto.getLatitude());
        model.setLongitude(dto.getLongitude());
        model.setAreaSqm(dto.getAreaSqm());
        model.setSupportPhone(dto.getSupportPhone());
        model.setEntryInstructions(dto.getEntryInstructions());
        model.setBookingConfirmationMode(dto.getBookingConfirmationMode() != null 
                ? dto.getBookingConfirmationMode() 
                : BookingConfirmationMode.INSTANT);
        model.setStatus(WorkspaceStatus.DRAFT);
        return model;
    }

    public static WorkspaceDto toDto(WorkspaceModel workspace) {
        return toDto(workspace, null, 0L);
    }

    public static WorkspaceDto toDto(WorkspaceModel workspace, Double distanceKm) {
        return toDto(workspace, distanceKm, 0L);
    }

    public static WorkspaceDto toDto(WorkspaceModel workspace, Double distanceKm, Long bookingCount) {
        if (workspace == null) {
            return null;
        }

        Long organizerId = null;
        String organizerName = null;
        if (workspace.getOrganizer() != null) {
            organizerId = workspace.getOrganizer().getId();
            organizerName = workspace.getOrganizer().getFullName();
        }

        WorkspaceStatus status = workspace.getStatus() != null ? workspace.getStatus() : WorkspaceStatus.DRAFT;
        String reviewStatus;
        String operatingStatus;
        String moderationStatus = (status == WorkspaceStatus.SUSPENDED) ? "Suspended" : "Normal";
        String reviewedByName = workspace.getReviewedBy() != null ? workspace.getReviewedBy().getFullName() : null;
        boolean isListingVisible = false;

        switch (status) {
            case DRAFT -> {
                reviewStatus = "Draft";
                operatingStatus = "Inactive";
            }
            case PENDING -> {
                reviewStatus = "Pending";
                operatingStatus = "Pending";
            }
            case ACTIVE -> {
                reviewStatus = "Approved";
                operatingStatus = "Active";
                isListingVisible = true;
            }
            case MAINTENANCE -> {
                reviewStatus = "Approved";
                operatingStatus = "Maintenance";
            }
            case INACTIVE -> {
                reviewStatus = "Approved";
                operatingStatus = "Inactive";
            }
            case SUSPENDED -> {
                reviewStatus = "Approved";
                operatingStatus = "Inactive";
            }
            case ARCHIVED -> {
                reviewStatus = (workspace.getReviewedAt() != null || workspace.getReviewedBy() != null)
                        ? "Approved"
                        : "Draft";
                operatingStatus = "Archived";
            }
            default -> {
                reviewStatus = "Draft";
                operatingStatus = "Inactive";
            }
        }

        Double roundedDistance = distanceKm != null ? Math.round(distanceKm * 100.0) / 100.0 : null;
        long safeBookingCount = bookingCount != null ? bookingCount : 0L;

        return WorkspaceDto.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .category(workspace.getCategory())
                .description(workspace.getDescription())
                .address(workspace.getAddress())
                .streetAddress(workspace.getAddress())
                .district(workspace.getDistrict())
                .city(workspace.getCity())
                .latitude(workspace.getLatitude())
                .longitude(workspace.getLongitude())
                .distanceKm(roundedDistance)
                .areaSqm(workspace.getAreaSqm())
                .usableAreaSqm(workspace.getAreaSqm())
                .supportPhone(workspace.getSupportPhone())
                .bookingConfirmationMode(workspace.getBookingConfirmationMode())
                .status(status)
                .reviewStatus(reviewStatus)
                .operatingStatus(operatingStatus)
                .moderationStatus(moderationStatus)
                .reviewFeedback(workspace.getReviewFeedback())
                .reviewedBy(reviewedByName)
                .reviewedAt(workspace.getReviewedAt())
                .submittedAt(workspace.getSubmittedAt())
                .isListingVisible(isListingVisible)
                .featuredOrder(workspace.getFeaturedOrder())
                .featuredUntil(workspace.getFeaturedUntil())
                .organizerId(organizerId)
                .organizerName(organizerName)
                .bookingCount(safeBookingCount)
                .totalBookings(safeBookingCount)
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .build();
    }

    public static WorkspaceDetailDto toDetailDto(WorkspaceModel workspace) {
        return toDetailDto(workspace, Collections.emptyList(), 0L);
    }

    public static WorkspaceDetailDto toDetailDto(WorkspaceModel workspace, List<WorkspaceOperatingHourModel> operatingHours) {
        return toDetailDto(workspace, operatingHours, 0L);
    }

    public static WorkspaceDetailDto toDetailDto(
            WorkspaceModel workspace,
            List<WorkspaceOperatingHourModel> operatingHours,
            Long bookingCount) {
        if (workspace == null) {
            return null;
        }

        Long organizerId = null;
        String organizerName = null;
        if (workspace.getOrganizer() != null) {
            organizerId = workspace.getOrganizer().getId();
            organizerName = workspace.getOrganizer().getFullName();
        }

        WorkspaceStatus status = workspace.getStatus() != null ? workspace.getStatus() : WorkspaceStatus.DRAFT;
        String reviewStatus;
        String operatingStatus;
        String moderationStatus = (status == WorkspaceStatus.SUSPENDED) ? "Suspended" : "Normal";
        String reviewedByName = workspace.getReviewedBy() != null ? workspace.getReviewedBy().getFullName() : null;
        boolean isListingVisible = false;

        switch (status) {
            case DRAFT -> {
                reviewStatus = "Draft";
                operatingStatus = "Inactive";
            }
            case PENDING -> {
                reviewStatus = "Pending";
                operatingStatus = "Pending";
            }
            case ACTIVE -> {
                reviewStatus = "Approved";
                operatingStatus = "Active";
                isListingVisible = true;
            }
            case MAINTENANCE -> {
                reviewStatus = "Approved";
                operatingStatus = "Maintenance";
            }
            case INACTIVE -> {
                reviewStatus = "Approved";
                operatingStatus = "Inactive";
            }
            case SUSPENDED -> {
                reviewStatus = "Approved";
                operatingStatus = "Inactive";
            }
            case ARCHIVED -> {
                reviewStatus = (workspace.getReviewedAt() != null || workspace.getReviewedBy() != null)
                        ? "Approved"
                        : "Draft";
                operatingStatus = "Archived";
            }
            default -> {
                reviewStatus = "Draft";
                operatingStatus = "Inactive";
            }
        }

        List<WorkspaceOperatingHourDto> hourDtos = operatingHours != null
                ? operatingHours.stream().map(WorkspaceMapper::toOperatingHourDto).toList()
                : Collections.emptyList();
        long safeBookingCount = bookingCount != null ? bookingCount : 0L;

        return WorkspaceDetailDto.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .category(workspace.getCategory())
                .description(workspace.getDescription())
                .address(workspace.getAddress())
                .streetAddress(workspace.getAddress())
                .district(workspace.getDistrict())
                .city(workspace.getCity())
                .latitude(workspace.getLatitude())
                .longitude(workspace.getLongitude())
                .areaSqm(workspace.getAreaSqm())
                .usableAreaSqm(workspace.getAreaSqm())
                .supportPhone(workspace.getSupportPhone())
                .entryInstructions(workspace.getEntryInstructions())
                .bookingConfirmationMode(workspace.getBookingConfirmationMode())
                .status(status)
                .reviewStatus(reviewStatus)
                .operatingStatus(operatingStatus)
                .moderationStatus(moderationStatus)
                .reviewFeedback(workspace.getReviewFeedback())
                .reviewedBy(reviewedByName)
                .reviewedAt(workspace.getReviewedAt())
                .isListingVisible(isListingVisible)
                .version(1)
                .submittedAt(workspace.getSubmittedAt())
                .featuredOrder(workspace.getFeaturedOrder())
                .featuredUntil(workspace.getFeaturedUntil())
                .organizerId(organizerId)
                .organizerName(organizerName)
                .bookingCount(safeBookingCount)
                .totalBookings(safeBookingCount)
                .operatingHours(hourDtos)
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .build();
    }

    public static WorkspaceOperatingHourDto toOperatingHourDto(WorkspaceOperatingHourModel model) {
        if (model == null) {
            return null;
        }
        boolean isClosed = model.isClosed();
        boolean is24Hours = !isClosed
                && model.getOpenTime() != null
                && model.getCloseTime() != null
                && model.getOpenTime().equals(LocalTime.MIN)
                && (model.getCloseTime().equals(LocalTime.of(23, 59)) || model.getCloseTime().equals(LocalTime.of(23, 59, 59)));

        return WorkspaceOperatingHourDto.builder()
                .id(model.getId() != null && model.getId().getDayOfWeek() != null ? String.valueOf(model.getId().getDayOfWeek()) : null)
                .dayOfWeek(model.getId() != null ? model.getId().getDayOfWeek() : null)
                .openTime(model.getOpenTime())
                .closeTime(model.getCloseTime())
                .isClosed(isClosed)
                .is24Hours(is24Hours)
                .closesNextDay(false)
                .build();
    }

    public static WorkspaceOperatingHourModel toOperatingHourModel(WorkspaceOperatingHourDto dto, WorkspaceModel workspace) {
        if (dto == null) {
            return null;
        }
        WorkspaceOperatingHourModel model = new WorkspaceOperatingHourModel();
        WorkspaceOperatingHourModel.Key key = new WorkspaceOperatingHourModel.Key(workspace.getId(), dto.getDayOfWeek());
        model.setId(key);
        model.setWorkspace(workspace);

        if (dto.isClosed()) {
            model.setClosed(true);
            model.setOpenTime(null);
            model.setCloseTime(null);
        } else if (dto.is24Hours()) {
            model.setClosed(false);
            model.setOpenTime(LocalTime.of(0, 0));
            model.setCloseTime(LocalTime.of(23, 59));
        } else {
            model.setClosed(false);
            model.setOpenTime(dto.getOpenTime());
            model.setCloseTime(dto.getCloseTime());
        }
        return model;
    }
}
