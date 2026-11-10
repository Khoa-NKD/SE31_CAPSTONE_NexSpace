package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.AdminFeaturedWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminModerationWorkspaceDto;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.AdminWorkspaceKpisDto;
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

    /**
     * Tìm kiếm không gian làm việc lân cận theo tọa độ GPS và bán kính (km).
     * Chỉ áp dụng cho các không gian đang hoạt động (ACTIVE).
     *
     * @param lat Vĩ độ người dùng (phạm vi [-90.0, 90.0])
     * @param lng Kinh độ người dùng (phạm vi [-180.0, 180.0])
     * @param radiusKm Bán kính tìm kiếm theo km (từ 0.5 đến 50.0 km)
     * @param pageRequest Tham số phân trang
     * @return Trang danh sách WorkspaceDto kèm khoảng cách distanceKm
     */
    Page<WorkspaceDto> findNearbyWorkspaces(Double lat, Double lng, Double radiusKm, PageRequestDTO pageRequest);

    /**
     * Lấy cấu hình giờ hoạt động cho workspace.
     * Áp dụng Strict Ownership Defense (ném NotFoundException nếu không sở hữu).
     *
     * @param organizerId ID của Organizer từ authenticated JWT (null nếu là Admin)
     * @param workspaceId ID không gian làm việc
     * @return Danh sách giờ hoạt động theo từng ngày trong tuần (1-7)
     */
    java.util.List<base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto> getOperatingHours(Long organizerId, Long workspaceId);

    /**
     * Cập nhật / lưu cấu hình giờ hoạt động cho workspace.
     * Áp dụng Strict Ownership Defense.
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param workspaceId ID không gian làm việc
     * @param dtos Danh sách giờ hoạt động cần cập nhật
     * @return Danh sách giờ hoạt động sau khi cập nhật
     */
    java.util.List<base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto> updateOperatingHours(
            Long organizerId,
            Long workspaceId,
            java.util.List<base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto> dtos);

    /**
     * Khách hàng xem giờ hoạt động công khai của workspace ACTIVE.
     *
     * @param workspaceId ID không gian làm việc
     * @return Danh sách giờ hoạt động
     */
    java.util.List<base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto> getPublicOperatingHours(Long workspaceId);

    /**
     * Organizer đăng không gian làm việc lên hệ thống (DRAFT hoặc PENDING -> mặc định tự duyệt thành ACTIVE).
     * Áp dụng Strict Ownership Defense (ném NotFoundException nếu không sở hữu).
     *
     * @param organizerId ID của Organizer từ authenticated JWT
     * @param workspaceId ID không gian làm việc
     * @return WorkspaceDetailDto chi tiết sau khi cập nhật
     */
    WorkspaceDetailDto submitWorkspace(Long organizerId, Long workspaceId);

    /**
     * Admin điều hành/đình chỉ không gian làm việc (ACTIVE <-> SUSPENDED).
     *
     * @param adminId ID của Admin
     * @param workspaceId ID không gian làm việc
     * @param dto DTO chứa trạng thái điều hành và lý do
     * @return WorkspaceDetailDto chi tiết sau khi điều hành
     */
    WorkspaceDetailDto adminModerateWorkspace(Long adminId, Long workspaceId, AdminModerationWorkspaceDto dto);

    /**
     * Admin cấu hình ghim nổi bật không gian làm việc (chỉ áp dụng cho ACTIVE).
     *
     * @param adminId ID của Admin
     * @param workspaceId ID không gian làm việc
     * @param dto DTO chứa thông tin ghim, thứ tự ưu tiên và thời hạn
     * @return WorkspaceDetailDto chi tiết sau khi ghim
     */
    WorkspaceDetailDto adminSetFeatured(Long adminId, Long workspaceId, AdminFeaturedWorkspaceDto dto);

    /**
     * Admin xem danh sách toàn bộ không gian làm việc có phân trang và bộ lọc.
     *
     * @param status Trạng thái lọc
     * @param city Thành phố lọc
     * @param search Từ khóa tìm kiếm
     * @param pageRequest Phân trang
     * @return Trang danh sách WorkspaceDto
     */
    Page<WorkspaceDto> getAdminWorkspaces(WorkspaceStatus status, String city, String search, PageRequestDTO pageRequest);

    /**
     * Admin lấy thống kê KPI các không gian làm việc theo trạng thái.
     *
     * @return AdminWorkspaceKpisDto
     */
    AdminWorkspaceKpisDto getAdminWorkspaceKpis();

    /**
     * Khách hàng xem danh sách các không gian làm việc nổi bật (chỉ ACTIVE và còn hạn).
     *
     * @return Danh sách WorkspaceDto nổi bật sắp xếp theo thứ tự ưu tiên
     */
    java.util.List<WorkspaceDto> getFeaturedWorkspaces();
}
