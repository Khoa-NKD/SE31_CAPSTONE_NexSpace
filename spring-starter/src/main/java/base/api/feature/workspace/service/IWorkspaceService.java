package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.WorkspaceStatus;
import org.springframework.data.domain.Page;

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

    /**
     * Xóa mềm không gian làm việc (chuyển sang trạng thái ARCHIVED).
     * Áp dụng Strict Ownership Defense.
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param workspaceId ID không gian làm việc cần lưu trữ / xóa mềm
     * @return WorkspaceDetailDto chi tiết không gian sau khi lưu trữ
     */
    WorkspaceDetailDto archiveWorkspace(Long organizerId, Long workspaceId);

    /**
     * Cập nhật vòng đời vận hành của workspace (pause, resume, maintenance, archive).
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param workspaceId ID không gian làm việc
     * @param dto DTO chứa hành động và lý do
     * @return WorkspaceDetailDto chi tiết không gian sau cập nhật
     */
    WorkspaceDetailDto updateLifecycle(Long organizerId, Long workspaceId, WorkspaceLifecycleDto dto);

    /**
     * Lấy danh sách không gian làm việc của Organizer có phân trang, tìm kiếm và lọc trạng thái.
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param status Bộ lọc trạng thái (nếu có)
     * @param pageRequest Tham số phân trang và sắp xếp
     * @return Trang danh sách WorkspaceDto
     */
    Page<WorkspaceDto> getMyWorkspaces(Long organizerId, WorkspaceStatus status, PageRequestDTO pageRequest);

    /**
     * Xem chi tiết không gian làm việc cho Organizer hoặc Admin.
     * Áp dụng Strict Ownership Defense (ném NotFoundException nếu không sở hữu).
     *
     * @param organizerId ID của Organizer từ authenticated JWT (null nếu là Admin)
     * @param workspaceId ID không gian làm việc
     * @return WorkspaceDetailDto chi tiết không gian
     */
    WorkspaceDetailDto getWorkspaceDetail(Long organizerId, Long workspaceId);

    /**
     * Xem chi tiết không gian làm việc công khai (chỉ xem được workspace ACTIVE).
     *
     * @param workspaceId ID không gian làm việc
     * @return WorkspaceDetailDto chi tiết không gian
     */
    WorkspaceDetailDto getPublicWorkspaceDetail(Long workspaceId);

    /**
     * Xem danh sách không gian làm việc công khai (chỉ hiển thị workspace ACTIVE).
     *
     * @param pageRequest Tham số phân trang, tìm kiếm, sắp xếp
     * @return Trang danh sách WorkspaceDto công khai
     */
    Page<WorkspaceDto> getPublicWorkspaces(PageRequestDTO pageRequest);
}
