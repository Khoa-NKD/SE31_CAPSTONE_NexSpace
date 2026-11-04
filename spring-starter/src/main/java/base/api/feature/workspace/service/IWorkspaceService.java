package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;

public interface IWorkspaceService {

    /**
     * Tạo không gian làm việc mới với trạng thái DRAFT.
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param dto DTO chứa thông tin không gian cần tạo
     * @return WorkspaceDetailDto chi tiết không gian vừa tạo
     */
    WorkspaceDetailDto createWorkspace(Long organizerId, CreateWorkspaceDto dto);
}
