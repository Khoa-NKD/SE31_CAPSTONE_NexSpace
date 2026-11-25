package base.api.feature.resource.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.resource.service.ResourceMaintenance;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Triển khai Động cơ Kiểm soát Đồng thời & Khóa Tài nguyên Nhất quán (Concurrency & Mutual Exclusion Defense Engine).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ResourceLockServiceImpl implements IResourceLockService {

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;

    private static final List<BookingStatus> CONFIRMED_BOOKING_STATUSES = List.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING_APPROVAL
    );

    private final base.api.feature.operations.repository.MaintenanceGroupRepository maintenanceGroups;
    private final IBookableResourceRepository bookableResourceRepository;
    private final IBookingRepository bookingRepository;
    private final IResourceBlockedSlotRepository blockedSlotRepository;

    @Override
    public LockedResourceContext acquireResourceLock(Long targetResourceId, LocalDateTime startTime, LocalDateTime endTime) {
        return acquireResourceLock(targetResourceId, startTime, endTime, null);
    }

    @Override
    public LockedResourceContext acquireResourceLock(
            Long targetResourceId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeBookingId
    ) {
        if (targetResourceId == null) {
            throw new BadRequestException("Mã tài nguyên không được để trống");
        }
        validateTimeRange(startTime, endTime);

        // 1. Nạp tài nguyên mục tiêu để xác định cấu trúc liên kết (Phòng cha / Bàn con)
        BookableResourceModel targetResource = bookableResourceRepository.findById(targetResourceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy chỗ ngồi hoặc phòng với ID: " + targetResourceId));

        // 2. Gom nhóm toàn bộ tài nguyên cần khóa (Hai chiều ROOM - DESK)
        Set<Long> idsToLock = new HashSet<>();
        idsToLock.add(targetResource.getId());

        boolean isRoom = targetResource.getResourceType() != null
                && targetResource.getResourceType().getCategory() == ResourceCategory.ROOM;

        if (isRoom) {
            // Chiều Phòng -> Ghế con: Khóa toàn bộ các bàn con trực thuộc phòng này
            List<BookableResourceModel> childDesks = bookableResourceRepository.findByParentRoomId(targetResource.getId());
            for (BookableResourceModel childDesk : childDesks) {
                idsToLock.add(childDesk.getId());
            }
        } else if (targetResource.getParentRoom() != null) {
            // Chiều Ghế con -> Phòng cha: Khóa luôn phòng cha trực tiếp
            idsToLock.add(targetResource.getParentRoom().getId());
        }

        // 3. Thực hiện khóa và kiểm tra xung đột nguyên tử
        return lockResourcesAndCheckConflict(targetResource, idsToLock, startTime, endTime, excludeBookingId, isRoom);
    }

    @Override
    public LockedResourceContext acquireResourcesLock(
            Collection<Long> resourceIds,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeBookingId
    ) {
        if (resourceIds == null || resourceIds.isEmpty()) {
            throw new BadRequestException("Danh sách tài nguyên cần khóa không được để trống");
        }
        validateTimeRange(startTime, endTime);

        // Gom nhóm toàn bộ ID cần khóa kèm các quan hệ liên đới
        Set<Long> allIdsToLock = new HashSet<>(resourceIds);
        for (Long id : resourceIds) {
            BookableResourceModel resource = bookableResourceRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy chỗ ngồi hoặc phòng với ID: " + id));

            if (resource.getResourceType() != null && resource.getResourceType().getCategory() == ResourceCategory.ROOM) {
                List<BookableResourceModel> childDesks = bookableResourceRepository.findByParentRoomId(resource.getId());
                for (BookableResourceModel childDesk : childDesks) {
                    allIdsToLock.add(childDesk.getId());
                }
            } else if (resource.getParentRoom() != null) {
                allIdsToLock.add(resource.getParentRoom().getId());
            }
        }

        return lockResourcesAndCheckConflict(null, allIdsToLock, startTime, endTime, excludeBookingId, false);
    }

    private LockedResourceContext lockResourcesAndCheckConflict(
            BookableResourceModel targetResource,
            Set<Long> idsToLock,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeBookingId,
            boolean isRoom
    ) {
        // Serialize holiday configuration against reservation writes, before locking any resources.
        var workspaceIds=bookableResourceRepository.findAllById(idsToLock).stream().map(r -> r.getFloorPlan().getWorkspace().getId()).distinct().sorted().toList();
        for(var workspaceId:workspaceIds) em.find(base.api.shared.entity.workspace.WorkspaceModel.class,workspaceId,jakarta.persistence.LockModeType.PESSIMISTIC_READ);
        // Giao thức Khóa Nhất quán Chống Deadlock (Deadlock-Free Locking Protocol):
        // Luôn luôn sắp xếp danh sách resourceId theo thứ tự tăng dần (ID ASC)
        List<Long> sortedIds = idsToLock.stream().sorted().toList();
        log.debug("Thực hiện khóa bi quan (PESSIMISTIC_WRITE) theo thứ tự ID ASC chống deadlock: {}", sortedIds);

        List<BookableResourceModel> lockedResources = new ArrayList<>(sortedIds.size());
        BookableResourceModel resolvedTarget = targetResource;

        for (Long id : sortedIds) {
            BookableResourceModel locked = bookableResourceRepository.findByIdForUpdate(id)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy tài nguyên với ID: " + id));

            if (locked.getStatus() == BookableResourceStatus.ARCHIVED || targetResource != null && locked.getStatus() == BookableResourceStatus.DISABLED) {
                if (targetResource != null && locked.getId().equals(targetResource.getId())) {
                    throw new ConflictException("Chỗ ngồi/phòng hiện không ở trạng thái sẵn sàng nhận đặt chỗ (Trạng thái: " + locked.getStatus() + ")");
                } else {
                    throw new ConflictException("Tài nguyên liên quan hiện đã ngừng hoạt động hoặc bị vô hiệu hóa (ID: " + locked.getId() + ")");
                }
            }

            lockedResources.add(locked);
            if (targetResource != null && locked.getId().equals(targetResource.getId())) {
                resolvedTarget = locked;
            }
        }

        if (resolvedTarget == null && !lockedResources.isEmpty()) {
            resolvedTarget = lockedResources.get(0);
        }

        if (targetResource != null && maintenanceGroups.wholeWorkspaceOverlaps(
                resolvedTarget.getFloorPlan().getWorkspace().getId(), startTime, endTime))
            throw new ConflictException("Không gian có lịch bảo trì trong khoảng đặt chỗ.");

        // Kiểm tra Xung đột Nguyên tử với Khóa Đọc Hiện tại (Locking Read / Current Read chống Phantom Read)
        LocalDateTime now = LocalDateTime.now();

        // Bulk locks are used by maintenance. A live checkout countdown is protected even
        // when the customer's reserved usage starts on another day.
        if (targetResource == null && bookingRepository.existsOverlappingActiveHoldWindow(
                sortedIds, now, startTime, endTime)) {
            throw new ConflictException("Chỗ này đang trong thời hạn giữ chỗ chờ thanh toán. Chỉ tạo bảo trì sau khi lượt giữ chỗ hết hạn hoặc được hủy.");
        }

        boolean hasBookingOverlap = bookingRepository.existsOverlappingBooking(
                sortedIds,
                CONFIRMED_BOOKING_STATUSES,
                BookingStatus.PENDING_PAYMENT,
                now,
                startTime,
                endTime,
                excludeBookingId
        );

        if (hasBookingOverlap) {
            if (isRoom) {
                throw new ConflictException("Phòng hoặc bàn làm việc bên trong phòng đã có người đặt hoặc đang giữ chỗ trong khung thời gian này");
            } else {
                throw new ConflictException("Chỗ ngồi hoặc phòng đã có người đặt hoặc đang giữ chỗ trong khoảng thời gian này");
            }
        }

        // Kiểm tra xung đột với khung giờ bảo trì hoặc sự kiện riêng (Blocked Slots)
        List<ResourceBlockedSlotModel> conflictingBlockedSlots = blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                sortedIds,
                startTime,
                endTime
        );

        boolean blocked = targetResource == null ? conflictingBlockedSlots.stream()
                .anyMatch(slot -> slot.getBlockType() != base.api.shared.enums.ResourceBlockType.MAINTENANCE)
                : conflictingBlockedSlots.stream().anyMatch(slot -> ResourceMaintenance.preventsBooking(targetResource, slot));
        if (blocked) {
            throw new ConflictException("Chỗ ngồi hoặc phòng đang bị khoá tạm thời (bảo trì hoặc sự kiện riêng)");
        }
        if (isRoom && ResourceMaintenance.capacity(resolvedTarget, lockedResources,
                ResourceMaintenance.maintenanceIds(conflictingBlockedSlots)) == 0) {
            throw new ConflictException("Phòng không còn ghế khả dụng trong thời gian bảo trì.");
        }

        return LockedResourceContext.builder()
                .targetResource(resolvedTarget)
                .availableCapacity(ResourceMaintenance.capacity(resolvedTarget, lockedResources,
                        ResourceMaintenance.maintenanceIds(conflictingBlockedSlots)))
                .lockedResources(lockedResources)
                .lockedResourceIds(sortedIds)
                .startTime(startTime)
                .endTime(endTime)
                .build();
    }

    private void validateTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new BadRequestException("Thời gian bắt đầu và kết thúc không được để trống");
        }
        if (!startTime.isBefore(endTime)) {
            throw new BadRequestException("Thời gian bắt đầu phải trước thời gian kết thúc");
        }
        LocalDateTime nowTolerance = LocalDateTime.now().minusMinutes(2);
        if (startTime.isBefore(nowTolerance)) {
            throw new BadRequestException("Thời gian bắt đầu không được ở trong quá khứ");
        }
    }
}

