package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto;
import base.api.feature.workspace.mapper.WorkspaceMapper;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkspaceServiceImpl implements IWorkspaceService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "name", "createdAt", "updatedAt", "status", "city", "district", "category"
    );

    private final IWorkspaceRepository workspaceRepository;
    private final IUserRepository userRepository;
    private final IWorkspaceOperatingHourRepository operatingHourRepository;

    @Override
    public WorkspaceDetailDto createWorkspace(Long organizerId, CreateWorkspaceDto dto) {
        UserModel organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new NotFoundException("Organizer không tồn tại"));

        WorkspaceModel workspace = WorkspaceMapper.toModel(dto, organizer);
        workspace.setStatus(WorkspaceStatus.DRAFT);

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        return WorkspaceMapper.toDetailDto(saved, hours);
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

    @Override
    public WorkspaceDetailDto archiveWorkspace(Long organizerId, Long workspaceId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
            return WorkspaceMapper.toDetailDto(workspace);
        }

        workspace.setStatus(WorkspaceStatus.ARCHIVED);
        WorkspaceModel archived = workspaceRepository.save(workspace);
        return WorkspaceMapper.toDetailDto(archived);
    }

    @Override
    public WorkspaceDetailDto updateLifecycle(Long organizerId, Long workspaceId, WorkspaceLifecycleDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (dto.getAction() == null) {
            throw new BadRequestException("Hành động vòng đời không hợp lệ");
        }

        switch (dto.getAction()) {
            case ARCHIVE -> workspace.setStatus(WorkspaceStatus.ARCHIVED);
            case PAUSE -> {
                if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
                    throw new ConflictException("Chỉ có thể tạm dừng không gian đang hoạt động (ACTIVE)");
                }
                workspace.setStatus(WorkspaceStatus.INACTIVE);
            }
            case RESUME -> {
                if (workspace.getStatus() != WorkspaceStatus.INACTIVE) {
                    throw new ConflictException("Chỉ có thể mở lại không gian đang tạm ngưng (INACTIVE)");
                }
                workspace.setStatus(WorkspaceStatus.ACTIVE);
            }
            case MAINTENANCE -> {
                if (workspace.getStatus() != WorkspaceStatus.ACTIVE && workspace.getStatus() != WorkspaceStatus.INACTIVE) {
                    throw new ConflictException("Không thể bảo trì không gian có trạng thái: " + workspace.getStatus());
                }
                workspace.setStatus(WorkspaceStatus.INACTIVE);
            }
        }

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        return WorkspaceMapper.toDetailDto(saved, hours);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> getMyWorkspaces(Long organizerId, WorkspaceStatus status, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS)
                : PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        String search = pageRequest != null ? pageRequest.normalizedSearch() : null;

        Page<WorkspaceModel> page = workspaceRepository.searchByOrganizer(organizerId, status, search, pageable);
        return page.map(WorkspaceMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceDetailDto getWorkspaceDetail(Long organizerId, Long workspaceId) {
        WorkspaceModel workspace;
        if (organizerId != null) {
            workspace = workspaceRepository.findByIdAndOrganizerId(workspaceId, organizerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc bạn không có quyền truy cập"));
        } else {
            workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc"));
        }
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
        return WorkspaceMapper.toDetailDto(workspace, hours);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceDetailDto getPublicWorkspaceDetail(Long workspaceId) {
        WorkspaceModel workspace = workspaceRepository.findByIdAndStatus(workspaceId, WorkspaceStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc không gian chưa được kích hoạt"));
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
        return WorkspaceMapper.toDetailDto(workspace, hours);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> getPublicWorkspaces(PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS)
                : PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        String search = pageRequest != null ? pageRequest.normalizedSearch() : null;

        Page<WorkspaceModel> page = workspaceRepository.searchPublic(WorkspaceStatus.ACTIVE, search, pageable);
        return page.map(WorkspaceMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceOperatingHourDto> getOperatingHours(Long organizerId, Long workspaceId) {
        if (organizerId != null) {
            workspaceRepository.findByIdAndOrganizerId(workspaceId, organizerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc bạn không có quyền truy cập"));
        } else {
            workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc"));
        }
        return operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId)
                .stream()
                .map(WorkspaceMapper::toOperatingHourDto)
                .toList();
    }

    @Override
    public List<WorkspaceOperatingHourDto> updateOperatingHours(
            Long organizerId,
            Long workspaceId,
            List<WorkspaceOperatingHourDto> dtos) {
        WorkspaceModel workspace;
        if (organizerId != null) {
            workspace = workspaceRepository.findByIdAndOrganizerId(workspaceId, organizerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc bạn không có quyền truy cập"));
        } else {
            workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc"));
        }

        if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
            throw new BadRequestException("Không thể cấu hình giờ hoạt động cho không gian đã lưu trữ");
        }

        List<WorkspaceOperatingHourModel> savedHours = saveOperatingHoursInternal(workspace, dtos);
        return savedHours.stream().map(WorkspaceMapper::toOperatingHourDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceOperatingHourDto> getPublicOperatingHours(Long workspaceId) {
        workspaceRepository.findByIdAndStatus(workspaceId, WorkspaceStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc không gian chưa được kích hoạt"));

        return operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId)
                .stream()
                .map(WorkspaceMapper::toOperatingHourDto)
                .toList();
    }

    private List<WorkspaceOperatingHourModel> saveOperatingHoursInternal(
            WorkspaceModel workspace,
            List<WorkspaceOperatingHourDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Integer> seenDays = new HashSet<>();
        List<WorkspaceOperatingHourModel> models = new ArrayList<>();

        for (WorkspaceOperatingHourDto dto : dtos) {
            if (dto.getDayOfWeek() == null || dto.getDayOfWeek() < 1 || dto.getDayOfWeek() > 7) {
                throw new BadRequestException("Thứ trong tuần phải từ 1 (Thứ Hai) đến 7 (Chủ Nhật)");
            }
            if (!seenDays.add(dto.getDayOfWeek())) {
                throw new BadRequestException("Trùng lặp cấu hình cho thứ " + dto.getDayOfWeek());
            }

            if (!dto.isClosed() && !dto.is24Hours()) {
                if (dto.getOpenTime() == null || dto.getCloseTime() == null) {
                    throw new BadRequestException("Vui lòng nhập đầy đủ giờ mở cửa và đóng cửa cho thứ " + dto.getDayOfWeek());
                }
                if (!dto.getCloseTime().isAfter(dto.getOpenTime())) {
                    throw new BadRequestException("Giờ đóng cửa (" + dto.getCloseTime() + ") phải sau giờ mở cửa (" + dto.getOpenTime() + ") cho thứ " + dto.getDayOfWeek());
                }
            }

            models.add(WorkspaceMapper.toOperatingHourModel(dto, workspace));
        }

        operatingHourRepository.saveAll(models);
        return operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
    }
}
