package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.mapper.WorkspaceMapper;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkspaceServiceImpl implements IWorkspaceService {

    private final IWorkspaceRepository workspaceRepository;
    private final IUserRepository userRepository;

    @Override
    public WorkspaceDetailDto createWorkspace(Long organizerId, CreateWorkspaceDto dto) {
        UserModel organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new NotFoundException("Organizer không tồn tại"));

        WorkspaceModel workspace = WorkspaceMapper.toModel(dto, organizer);
        workspace.setStatus(WorkspaceStatus.DRAFT);

        WorkspaceModel saved = workspaceRepository.save(workspace);
        return WorkspaceMapper.toDetailDto(saved);
    }

    @Override
    public WorkspaceDetailDto updateWorkspace(Long organizerId, Long workspaceId, UpdateWorkspaceDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense: Không thuộc quyền sở hữu ném 404 thay vì 403
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
            throw new BadRequestException("Không thể cập nhật không gian làm việc đã bị lưu trữ");
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            workspace.setName(dto.getName());
        }
        if (dto.getCategory() != null) {
            workspace.setCategory(dto.getCategory());
        }
        if (dto.getDescription() != null) {
            workspace.setDescription(dto.getDescription());
        }
        if (dto.getAddress() != null) {
            workspace.setAddress(dto.getAddress());
        }
        if (dto.getDistrict() != null) {
            workspace.setDistrict(dto.getDistrict());
        }
        if (dto.getCity() != null) {
            workspace.setCity(dto.getCity());
        }
        if (dto.getLatitude() != null) {
            workspace.setLatitude(dto.getLatitude());
        }
        if (dto.getLongitude() != null) {
            workspace.setLongitude(dto.getLongitude());
        }
        if (dto.getAreaSqm() != null) {
            workspace.setAreaSqm(dto.getAreaSqm());
        }
        if (dto.getSupportPhone() != null) {
            workspace.setSupportPhone(dto.getSupportPhone());
        }
        if (dto.getEntryInstructions() != null) {
            workspace.setEntryInstructions(dto.getEntryInstructions());
        }
        if (dto.getBookingConfirmationMode() != null) {
            workspace.setBookingConfirmationMode(dto.getBookingConfirmationMode());
        }

        WorkspaceModel updated = workspaceRepository.save(workspace);
        return WorkspaceMapper.toDetailDto(updated);
    }
}
