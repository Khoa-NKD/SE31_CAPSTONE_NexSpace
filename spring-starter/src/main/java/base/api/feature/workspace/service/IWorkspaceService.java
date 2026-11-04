package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
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

    /**
     * Cập nhật thông tin không gian làm việc.
     * Áp dụng Strict Ownership Defense (ném NotFoundException nếu không sở hữu).
     * Không cho phép thay đổi trạng thái status trực tiếp qua hàm này.
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param workspaceId ID không gian làm việc cần cập nhật
     * @param dto DTO chứa các thông tin cập nhật
     * @return WorkspaceDetailDto chi tiết không gian sau khi cập nhật
     */
    WorkspaceDetailDto updateWorkspace(Long organizerId, Long workspaceId, UpdateWorkspaceDto dto);
}
