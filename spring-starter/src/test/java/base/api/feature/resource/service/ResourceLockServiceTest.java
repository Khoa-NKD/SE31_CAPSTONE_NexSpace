package base.api.feature.resource.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.impl.ResourceLockServiceImpl;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Kiểm thử Động cơ Khóa Tài nguyên Nhất quán (ResourceLockServiceTest)")
class ResourceLockServiceTest {

    @Mock
    private IBookableResourceRepository bookableResourceRepository;

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IResourceBlockedSlotRepository blockedSlotRepository;

    @InjectMocks
    private ResourceLockServiceImpl resourceLockService;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @BeforeEach
    void setUp() {
        startTime = LocalDateTime.now().plusHours(2);
        endTime = LocalDateTime.now().plusHours(4);
    }

    @Nested
    @DisplayName("Thẩm định tham số đầu vào")
    class InputValidationTests {

        @Test
        @DisplayName("Ném lỗi BadRequestException khi targetResourceId là null")
        void targetResourceIdNull_ThrowsBadRequest() {
            assertThatThrownBy(() -> resourceLockService.acquireResourceLock(null, startTime, endTime))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Mã tài nguyên không được để trống");
        }

        @Test
        @DisplayName("Ném lỗi BadRequestException khi startTime sau endTime")
        void startTimeAfterEndTime_ThrowsBadRequest() {
            assertThatThrownBy(() -> resourceLockService.acquireResourceLock(1L, endTime, startTime))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Thời gian bắt đầu phải trước thời gian kết thúc");
        }

        @Test
        @DisplayName("Ném lỗi BadRequestException khi startTime ở quá khứ (> 2 phút)")
        void startTimeInPast_ThrowsBadRequest() {
            LocalDateTime pastTime = LocalDateTime.now().minusMinutes(5);
            assertThatThrownBy(() -> resourceLockService.acquireResourceLock(1L, pastTime, endTime))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Thời gian bắt đầu không được ở trong quá khứ");
        }
    }

    @Nested
    @DisplayName("Giao thức Khóa Nhất quán Chống Deadlock (ID ASC)")
    class DeadlockFreeLockingOrderTests {

        @Test
        @DisplayName("Khóa bàn con có phòng cha: Thứ tự khóa phải tăng dần ID ASC [Desk 2, Parent Room 5]")
        void deskWithParentRoom_LocksInAscendingOrder() {
            Long deskId = 2L;
            Long parentRoomId = 5L;

            BookableResourceModel parentRoom = new BookableResourceModel();
            parentRoom.setId(parentRoomId);
            parentRoom.setStatus(BookableResourceStatus.ACTIVE);

            BookableResourceModel desk = new BookableResourceModel();
            desk.setId(deskId);
            desk.setParentRoom(parentRoom);
            desk.setStatus(BookableResourceStatus.ACTIVE);

            when(bookableResourceRepository.findById(deskId)).thenReturn(Optional.of(desk));
            when(bookableResourceRepository.findByIdForUpdate(deskId)).thenReturn(Optional.of(desk));
            when(bookableResourceRepository.findByIdForUpdate(parentRoomId)).thenReturn(Optional.of(parentRoom));

            when(bookingRepository.findOverlappingBookingsForUpdate(anyList(), anyCollection(), any(), any(), eq(startTime), eq(endTime), any()))
                    .thenReturn(Collections.emptyList());
            when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(anyList(), eq(startTime), eq(endTime)))
                    .thenReturn(Collections.emptyList());

            LockedResourceContext context = resourceLockService.acquireResourceLock(deskId, startTime, endTime);

            assertThat(context).isNotNull();
            assertThat(context.getTargetResource().getId()).isEqualTo(deskId);
            assertThat(context.getLockedResourceIds()).containsExactly(2L, 5L);

            // Xác minh thứ tự gọi findByIdForUpdate theo đúng ID ASC: 2 trước, 5 sau
            InOrder inOrder = inOrder(bookableResourceRepository);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(2L);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(5L);
        }

        @Test
        @DisplayName("Khóa bàn con có ID lớn hơn phòng cha: Thứ tự khóa vẫn phải tăng dần ID ASC [Parent Room 2, Desk 9]")
        void deskWithParentRoom_WhenDeskIdHigherThanRoomId_LocksInAscendingOrder() {
            Long deskId = 9L;
            Long parentRoomId = 2L;

            BookableResourceModel parentRoom = new BookableResourceModel();
            parentRoom.setId(parentRoomId);
            parentRoom.setStatus(BookableResourceStatus.ACTIVE);

            BookableResourceModel desk = new BookableResourceModel();
            desk.setId(deskId);
            desk.setParentRoom(parentRoom);
            desk.setStatus(BookableResourceStatus.ACTIVE);

            when(bookableResourceRepository.findById(deskId)).thenReturn(Optional.of(desk));
            when(bookableResourceRepository.findByIdForUpdate(parentRoomId)).thenReturn(Optional.of(parentRoom));
            when(bookableResourceRepository.findByIdForUpdate(deskId)).thenReturn(Optional.of(desk));

            when(bookingRepository.findOverlappingBookingsForUpdate(anyList(), anyCollection(), any(), any(), eq(startTime), eq(endTime), any()))
                    .thenReturn(Collections.emptyList());
            when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(anyList(), eq(startTime), eq(endTime)))
                    .thenReturn(Collections.emptyList());

            LockedResourceContext context = resourceLockService.acquireResourceLock(deskId, startTime, endTime);

            assertThat(context).isNotNull();
            assertThat(context.getLockedResourceIds()).containsExactly(2L, 9L);

            // Xác minh thứ tự gọi findByIdForUpdate: 2 trước, 9 sau
            InOrder inOrder = inOrder(bookableResourceRepository);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(2L);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(9L);
        }

        @Test
        @DisplayName("Khóa phòng họp có nhiều bàn con: Thứ tự khóa phòng và bàn con phải sắp xếp tăng dần ID ASC")
        void roomWithChildDesks_LocksAllInAscendingOrder() {
            Long roomId = 10L;

            ResourceTypeModel roomType = new ResourceTypeModel();
            roomType.setCategory(ResourceCategory.ROOM);

            BookableResourceModel room = new BookableResourceModel();
            room.setId(roomId);
            room.setResourceType(roomType);
            room.setStatus(BookableResourceStatus.ACTIVE);

            BookableResourceModel childDesk1 = new BookableResourceModel();
            childDesk1.setId(3L);
            childDesk1.setStatus(BookableResourceStatus.ACTIVE);

            BookableResourceModel childDesk2 = new BookableResourceModel();
            childDesk2.setId(15L);
            childDesk2.setStatus(BookableResourceStatus.ACTIVE);

            BookableResourceModel childDesk3 = new BookableResourceModel();
            childDesk3.setId(8L);
            childDesk3.setStatus(BookableResourceStatus.ACTIVE);

            when(bookableResourceRepository.findById(roomId)).thenReturn(Optional.of(room));
            when(bookableResourceRepository.findByParentRoomId(roomId)).thenReturn(List.of(childDesk1, childDesk2, childDesk3));

            when(bookableResourceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(childDesk1));
            when(bookableResourceRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(childDesk3));
            when(bookableResourceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(room));
            when(bookableResourceRepository.findByIdForUpdate(15L)).thenReturn(Optional.of(childDesk2));

            when(bookingRepository.findOverlappingBookingsForUpdate(anyList(), anyCollection(), any(), any(), eq(startTime), eq(endTime), any()))
                    .thenReturn(Collections.emptyList());
            when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(anyList(), eq(startTime), eq(endTime)))
                    .thenReturn(Collections.emptyList());

            LockedResourceContext context = resourceLockService.acquireResourceLock(roomId, startTime, endTime);

            assertThat(context).isNotNull();
            assertThat(context.getTargetResource().getId()).isEqualTo(roomId);
            assertThat(context.getLockedResourceIds()).containsExactly(3L, 8L, 10L, 15L);

            InOrder inOrder = inOrder(bookableResourceRepository);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(3L);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(8L);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(10L);
            inOrder.verify(bookableResourceRepository).findByIdForUpdate(15L);
        }
    }

    @Nested
    @DisplayName("Kiểm tra Xung đột Nguyên tử & Trạng thái Khả dụng")
    class AtomicConflictCheckTests {

        @Test
        @DisplayName("Ném ConflictException khi phát hiện booking trùng lặp đang active")
        void overlappingBookingExists_ThrowsConflictException() {
            Long resourceId = 1L;
            BookableResourceModel resource = new BookableResourceModel();
            resource.setId(resourceId);
            resource.setStatus(BookableResourceStatus.ACTIVE);

            when(bookableResourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
            when(bookableResourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));

            when(bookingRepository.findOverlappingBookingsForUpdate(anyList(), anyCollection(), any(), any(), eq(startTime), eq(endTime), any()))
                    .thenReturn(List.of(new BookingModel()));

            assertThatThrownBy(() -> resourceLockService.acquireResourceLock(resourceId, startTime, endTime))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("đã có người đặt hoặc đang giữ chỗ");
        }

        @Test
        @DisplayName("Ném ConflictException khi phát hiện slot bảo trì / sự kiện riêng bị khóa")
        void conflictingBlockedSlotExists_ThrowsConflictException() {
            Long resourceId = 1L;
            BookableResourceModel resource = new BookableResourceModel();
            resource.setId(resourceId);
            resource.setStatus(BookableResourceStatus.ACTIVE);

            when(bookableResourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
            when(bookableResourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));

            when(bookingRepository.findOverlappingBookingsForUpdate(anyList(), anyCollection(), any(), any(), eq(startTime), eq(endTime), any()))
                    .thenReturn(Collections.emptyList());

            ResourceBlockedSlotModel blockedSlot = new ResourceBlockedSlotModel();
            blockedSlot.setId(99L);
            when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(anyList(), eq(startTime), eq(endTime)))
                    .thenReturn(List.of(blockedSlot));

            assertThatThrownBy(() -> resourceLockService.acquireResourceLock(resourceId, startTime, endTime))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("đang bị khoá tạm thời");
        }

        @Test
        @DisplayName("Ném ConflictException khi tài nguyên có trạng thái ARCHIVED hoặc DISABLED")
        void archivedResource_ThrowsConflictException() {
            Long resourceId = 1L;
            BookableResourceModel resource = new BookableResourceModel();
            resource.setId(resourceId);
            resource.setStatus(BookableResourceStatus.ARCHIVED);

            when(bookableResourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
            when(bookableResourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));

            assertThatThrownBy(() -> resourceLockService.acquireResourceLock(resourceId, startTime, endTime))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("không ở trạng thái sẵn sàng");
        }
    }
}

