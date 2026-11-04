package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.mapper.WorkspaceMapper;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
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
}
