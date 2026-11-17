package base.api.feature.resource;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.resource.service.impl.ResourceLockServiceImpl;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.ConflictException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Test kiểm thử khả năng kiểm soát đồng thời (Concurrency Control)
 * và chống đặt trùng (Mutual Exclusion / Anti-Overbooking Engine) trên cơ sở dữ liệu thật (H2 MySQL Mode).
 */
@DataJpaTest(
        properties = {
                "spring.datasource.url=jdbc:h2:mem:concurrency_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
                "spring.jpa.show-sql=false",
                "spring.sql.init.mode=never",
                "spring.flyway.enabled=false"
        },
        showSql = false)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
        ResourceLockServiceImpl.class,
        DoubleBookingConcurrencyIntegrationTest.ConcurrencyBookingHelper.class
})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@DisplayName("Kiểm thử Tích hợp Đa luồng Chống Đặt trùng (DoubleBookingConcurrencyIntegrationTest)")
class DoubleBookingConcurrencyIntegrationTest {

    @Autowired
    private IBookingRepository bookingRepository;

    @Autowired
    private ConcurrencyBookingHelper bookingHelper;

    private WorkspaceModel workspace;
    private FloorPlanModel floorPlan;
    private ResourceTypeModel deskType;
    private ResourceTypeModel roomType;
    private UserModel customer1;
    private UserModel customer2;

    @BeforeEach
    void setUp() {
        bookingHelper.cleanDatabase();

        RoleModel roleOrganizer = bookingHelper.getOrCreateRole("ORGANIZER");
        RoleModel roleCustomer = bookingHelper.getOrCreateRole("CUSTOMER");

        UserModel owner = new UserModel();
        owner.setUserName("host_owner");
        owner.setEmail("host@nexspace.com");
        owner.setPassword("test-only");
        owner.setFirstName("Host");
        owner.setLastName("Owner");
        owner.setRoleEntity(roleOrganizer);
        owner.setVerified(true);
        owner.setStatus(UserStatus.ACTIVE);

        customer1 = new UserModel();
        customer1.setUserName("customer_1");
        customer1.setEmail("customer1@nexspace.com");
        customer1.setPassword("test-only");
        customer1.setFirstName("Khách 1");
        customer1.setLastName("Nguyễn");
        customer1.setRoleEntity(roleCustomer);
        customer1.setVerified(true);
        customer1.setStatus(UserStatus.ACTIVE);

        customer2 = new UserModel();
        customer2.setUserName("customer_2");
        customer2.setEmail("customer2@nexspace.com");
        customer2.setPassword("test-only");
        customer2.setFirstName("Khách 2");
        customer2.setLastName("Trần");
        customer2.setRoleEntity(roleCustomer);
        customer2.setVerified(true);
        customer2.setStatus(UserStatus.ACTIVE);

        workspace = new WorkspaceModel();
        workspace.setName("NexSpace Coworking Hub");
        workspace.setOrganizer(owner);
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        workspace.setBookingConfirmationMode(BookingConfirmationMode.INSTANT);

        floorPlan = new FloorPlanModel();
        floorPlan.setName("Tầng 3");
        floorPlan.setFloorNumber(3);
        floorPlan.setWorkspace(workspace);

        deskType = new ResourceTypeModel();
        deskType.setName("Bàn làm việc Focus");
        deskType.setWorkspace(workspace);
        deskType.setCategory(ResourceCategory.DESK);
        deskType.setPricePerHour(new BigDecimal("35000.00"));
        deskType.setActive(true);

        roomType = new ResourceTypeModel();
        roomType.setName("Phòng họp Sáng Tạo");
        roomType.setWorkspace(workspace);
        roomType.setCategory(ResourceCategory.ROOM);
        roomType.setPricePerHour(new BigDecimal("200000.00"));
        roomType.setCapacity(8);
        roomType.setActive(true);

        bookingHelper.seedInitialData(owner, customer1, customer2, workspace, floorPlan, deskType, roomType);
    }

    @Test
    @DisplayName("2 luồng đồng thời tranh chấp 1 chỗ ngồi (DESK): Đúng 1 luồng thành công, 1 luồng nhận ConflictException")
    void testConcurrentBooking_ExactlyOneThreadSucceeds() throws Exception {
        // Tạo 1 tài nguyên bàn làm việc
        BookableResourceModel desk = new BookableResourceModel();
        desk.setLabel("D-101");
        desk.setName("Bàn Focus 101");
        desk.setFloorPlan(floorPlan);
        desk.setResourceType(deskType);
        desk.setStatus(BookableResourceStatus.ACTIVE);
        desk = bookingHelper.saveResource(desk);

        Long resourceId = desk.getId();
        LocalDateTime startTime = LocalDateTime.now().plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endTime = startTime.plusHours(2);

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startSignal = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        Callable<Void> task1 = () -> {
            readyLatch.countDown();
            try {
                startSignal.await();
                bookingHelper.attemptLockAndBook(resourceId, customer1, workspace, startTime, endTime, "BK-CONC-001");
                successCount.incrementAndGet();
            } catch (ConflictException ce) {
                conflictCount.incrementAndGet();
            } catch (Throwable t) {
                unexpectedErrors.add(t);
            }
            return null;
        };

        Callable<Void> task2 = () -> {
            readyLatch.countDown();
            try {
                startSignal.await();
                bookingHelper.attemptLockAndBook(resourceId, customer2, workspace, startTime, endTime, "BK-CONC-002");
                successCount.incrementAndGet();
            } catch (ConflictException ce) {
                conflictCount.incrementAndGet();
            } catch (Throwable t) {
                unexpectedErrors.add(t);
            }
            return null;
        };

        executor.submit(task1);
        executor.submit(task2);

        // Đợi cả 2 luồng vào vạch xuất phát
        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();

        // Kích hoạt đồng thời
        startSignal.countDown();

        executor.shutdown();
        assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

        // Khẳng định kết quả nghiệm thu:
        assertThat(unexpectedErrors).as("Không được có lỗi bất thường ngoại trừ ConflictException").isEmpty();
        assertThat(successCount.get()).as("Chỉ đúng duy nhất 1 luồng đặt chỗ thành công").isEqualTo(1);
        assertThat(conflictCount.get()).as("Luồng còn lại bắt buộc nhận ConflictException").isEqualTo(1);

        // Kiểm tra cơ sở dữ liệu: Chỉ tồn tại duy nhất 1 booking được tạo cho resource này
        List<BookingModel> bookingsInDb = bookingRepository.findAll();
        assertThat(bookingsInDb).hasSize(1);
        assertThat(bookingsInDb.get(0).getResource().getId()).isEqualTo(resourceId);
        assertThat(bookingsInDb.get(0).getStartTime()).isEqualTo(startTime);
    }

    @Test
    @DisplayName("Chống Deadlock và Xung đột Hai chiều: 1 luồng đặt ROOM và 1 luồng đặt DESK con đồng thời")
    void testRoomAndChildDeskConcurrency_NoDeadlockAndMutualExclusion() throws Exception {
        // Tạo 1 phòng họp
        BookableResourceModel room = new BookableResourceModel();
        room.setLabel("R-201");
        room.setName("Phòng Họp 201");
        room.setFloorPlan(floorPlan);
        room.setResourceType(roomType);
        room.setStatus(BookableResourceStatus.ACTIVE);
        room = bookingHelper.saveResource(room);

        // Tạo 1 bàn con bên trong phòng họp này
        BookableResourceModel childDesk = new BookableResourceModel();
        childDesk.setLabel("D-201-A");
        childDesk.setName("Bàn Ghế Con A trong phòng 201");
        childDesk.setFloorPlan(floorPlan);
        childDesk.setResourceType(deskType);
        childDesk.setParentRoom(room);
        childDesk.setStatus(BookableResourceStatus.ACTIVE);
        childDesk = bookingHelper.saveResource(childDesk);

        Long roomId = room.getId();
        Long deskId = childDesk.getId();

        LocalDateTime startTime = LocalDateTime.now().plusDays(1).withHour(14).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endTime = startTime.plusHours(2);

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startSignal = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        // Luồng A: Cố gắng đặt ROOM (sẽ khóa cả Desk và Room theo ID ASC)
        Callable<Void> roomBookingTask = () -> {
            readyLatch.countDown();
            try {
                startSignal.await();
                bookingHelper.attemptLockAndBook(roomId, customer1, workspace, startTime, endTime, "BK-ROOM-001");
                successCount.incrementAndGet();
            } catch (ConflictException ce) {
                conflictCount.incrementAndGet();
            } catch (Throwable t) {
                unexpectedErrors.add(t);
            }
            return null;
        };

        // Luồng B: Cố gắng đặt DESK con (sẽ khóa cả Desk và Room theo ID ASC)
        Callable<Void> deskBookingTask = () -> {
            readyLatch.countDown();
            try {
                startSignal.await();
                bookingHelper.attemptLockAndBook(deskId, customer2, workspace, startTime, endTime, "BK-DESK-001");
                successCount.incrementAndGet();
            } catch (ConflictException ce) {
                conflictCount.incrementAndGet();
            } catch (Throwable t) {
                unexpectedErrors.add(t);
            }
            return null;
        };

        executor.submit(roomBookingTask);
        executor.submit(deskBookingTask);

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startSignal.countDown();

        executor.shutdown();
        assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

        // Không có Deadlock, 1 luồng thắng và 1 luồng nhận ConflictException
        assertThat(unexpectedErrors).as("Không xảy ra Deadlock hay lỗi ngoài ý muốn").isEmpty();
        assertThat(successCount.get()).as("Chỉ đúng 1 thao tác thành công (đặt phòng hoặc đặt bàn)").isEqualTo(1);
        assertThat(conflictCount.get()).as("Thao tác còn lại bị chặn bởi xung đột hai chiều").isEqualTo(1);

        List<BookingModel> bookings = bookingRepository.findAll();
        assertThat(bookings).hasSize(1);
    }

    /**
     * Helper component bọc các thao tác database trong các transaction độc lập (REQUIRES_NEW).
     */
    @TestComponent
    public static class ConcurrencyBookingHelper {

        @Autowired
        private EntityManager em;

        @Autowired
        private IResourceLockService resourceLockService;

        @Autowired
        private IBookingRepository bookingRepository;

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public RoleModel getOrCreateRole(String roleName) {
            return em.createQuery("select r from RoleModel r where r.name = :name", RoleModel.class)
                    .setParameter("name", roleName)
                    .getResultStream()
                    .findFirst()
                    .orElseGet(() -> {
                        RoleModel r = new RoleModel(roleName, null);
                        em.persist(r);
                        em.flush();
                        return r;
                    });
        }

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public void cleanDatabase() {
            em.createQuery("delete from BookingModel").executeUpdate();
            em.createQuery("delete from BookableResourceModel").executeUpdate();
            em.createQuery("delete from FloorPlanModel").executeUpdate();
            em.createQuery("delete from ResourceTypeModel").executeUpdate();
            em.createQuery("delete from WorkspaceModel").executeUpdate();
            em.createQuery("delete from UserModel").executeUpdate();
            em.flush();
        }

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public void seedInitialData(
                UserModel owner,
                UserModel c1,
                UserModel c2,
                WorkspaceModel ws,
                FloorPlanModel fp,
                ResourceTypeModel dt,
                ResourceTypeModel rt
        ) {
            em.persist(owner);
            em.persist(c1);
            em.persist(c2);
            em.persist(ws);
            em.persist(fp);
            em.persist(dt);
            em.persist(rt);
            em.flush();
        }

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public BookableResourceModel saveResource(BookableResourceModel resource) {
            em.persist(resource);
            em.flush();
            return resource;
        }

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public BookingModel attemptLockAndBook(
                Long resourceId,
                UserModel customer,
                WorkspaceModel workspace,
                LocalDateTime startTime,
                LocalDateTime endTime,
                String bookingCode
        ) {
            // 1. Khóa bi quan và kiểm tra xung đột nguyên tử (Mutual Exclusion)
            LockedResourceContext lockContext = resourceLockService.acquireResourceLock(resourceId, startTime, endTime);

            // 2. Tạo bản ghi booking giữ chỗ
            BookingModel booking = new BookingModel();
            booking.setBookingCode(bookingCode);
            booking.setCustomer(customer);
            booking.setWorkspace(workspace);
            booking.setResource(lockContext.getTargetResource());
            booking.setStartTime(startTime);
            booking.setEndTime(endTime);
            booking.setStatus(BookingStatus.PENDING_PAYMENT);
            booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(10));
            booking.setPartySize(1);
            booking.setPriceType(PriceType.HOURLY);
            booking.setBaseAmount(new BigDecimal("50000.00"));
            booking.setFinalPrice(new BigDecimal("50000.00"));
            booking.setPlatformFeeAmount(BigDecimal.ZERO);
            booking.setSource(BookingSource.SEARCH);

            BookingModel saved = bookingRepository.save(booking);
            em.flush();
            return saved;
        }
    }
}
