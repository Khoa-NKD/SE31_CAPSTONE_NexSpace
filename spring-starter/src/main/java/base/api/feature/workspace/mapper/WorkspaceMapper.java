package base.api.feature.workspace.mapper;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceStatus;

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

    public static WorkspaceDetailDto toDetailDto(WorkspaceModel workspace) {
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
        boolean isListingVisible = false;

        switch (status) {
            case DRAFT -> {
                reviewStatus = "Draft";
                operatingStatus = "Inactive";
            }
            case PENDING_REVIEW -> {
                reviewStatus = "Pending";
                operatingStatus = "Inactive";
            }
            case REJECTED -> {
                reviewStatus = "Rejected";
                operatingStatus = "Inactive";
            }
            case ACTIVE -> {
                reviewStatus = "Approved";
                operatingStatus = "Active";
                isListingVisible = true;
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
                reviewStatus = "Draft";
                operatingStatus = "Archived";
            }
            default -> {
                reviewStatus = "Draft";
                operatingStatus = "Inactive";
            }
        }

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
                .isListingVisible(isListingVisible)
                .version(1)
                .submittedAt(workspace.getSubmittedAt())
                .organizerId(organizerId)
                .organizerName(organizerName)
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .build();
    }
}
