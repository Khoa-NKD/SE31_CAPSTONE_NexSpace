package base.api.feature.operations;

import base.api.feature.operations.dto.OperationsDtos.*;
import base.api.feature.operations.service.OrganizerOperationsService;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.resource.service.impl.ResourceLockServiceImpl;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.shared.entity.*;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties={"spring.datasource.url=jdbc:h2:mem:operations;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false","spring.sql.init.mode=never"},showSql=false)
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({OrganizerOperationsService.class,ResourceLockServiceImpl.class})
class OrganizerOperationsIntegrationTest {
    @Autowired EntityManager em;
    @Autowired OrganizerOperationsService service;
    @Autowired IResourceBlockedSlotRepository blocks;
    @Autowired IBookingRepository bookings;
    @Autowired IResourceLockService locks;
    @MockitoBean IAuditService audit;
    UserModel owner;WorkspaceModel workspace;BookableResourceModel room,desk,openDesk;
    final LocalDateTime start=LocalDateTime.of(2099,1,1,10,0);
    @BeforeEach void seed() {
        var role=new RoleModel("ORGANIZER","test");em.persist(role);
        owner=new UserModel();owner.setUserName("operations-host");owner.setEmail("operations@example.test");owner.setPassword("test-only");owner.setRoleEntity(role);owner.setStatus(UserStatus.ACTIVE);em.persist(owner);
        workspace=new WorkspaceModel();workspace.setOrganizer(owner);workspace.setName("Operations test");workspace.setStatus(WorkspaceStatus.ACTIVE);em.persist(workspace);
        var floor=new FloorPlanModel();floor.setWorkspace(workspace);floor.setFloorNumber(1);floor.setName("Floor 1");em.persist(floor);
        var roomType=new ResourceTypeModel();roomType.setWorkspace(workspace);roomType.setName("Room");roomType.setCategory(ResourceCategory.ROOM);roomType.setCurrency(ResourceCurrency.VND);roomType.setPricePerHour(BigDecimal.TEN);em.persist(roomType);
        var deskType=new ResourceTypeModel();deskType.setWorkspace(workspace);deskType.setName("Desk");deskType.setCategory(ResourceCategory.DESK);deskType.setCurrency(ResourceCurrency.VND);deskType.setPricePerHour(BigDecimal.ONE);em.persist(deskType);
        room=resource("R1",floor,roomType,null);desk=resource("D1",floor,deskType,room);openDesk=resource("D2",floor,deskType,null);em.flush();
    }
    private BookableResourceModel resource(String code,FloorPlanModel floor,ResourceTypeModel type,BookableResourceModel parent) {
        var r=new BookableResourceModel();r.setLabel(code);r.setName(code);r.setFloorPlan(floor);r.setResourceType(type);r.setParentRoom(parent);r.setStatus(BookableResourceStatus.ACTIVE);em.persist(r);return r;
    }
    private BlockInput input(Long id,LocalDateTime from,LocalDateTime to) {return new BlockInput(List.of(id),from,to,ResourceBlockType.MAINTENANCE,"Maintenance");}
    @Test void roomBlockIsVisibleAndPreventsBothRoomAndChildBooking() {
        service.createBlocks(owner.getId(),workspace.getId(),input(room.getId(),start,start.plusHours(2)));
        em.flush();em.clear();
        assertThat(blocks.findConflictingBlockedSlots(desk.getId(),start,start.plusHours(1))).hasSize(1);
        assertThat(service.blocks(owner.getId(),workspace.getId(),start,start.plusHours(3))).hasSize(1);
        assertThatThrownBy(()->locks.acquireResourceLock(desk.getId(),start,start.plusHours(1))).isInstanceOf(ConflictException.class);
    }
    @Test void childBlockPreventsRoomButDoesNotHideOpenAreaResources() {
        service.createBlocks(owner.getId(),workspace.getId(),input(desk.getId(),start,start.plusHours(2)));
        em.flush();em.clear();
        assertThat(blocks.findConflictingBlockedSlots(room.getId(),start,start.plusHours(1))).hasSize(1);
        assertThat(blocks.findConflictingBlockedSlots(openDesk.getId(),start,start.plusHours(1))).isEmpty();
        assertThat(service.pricing(owner.getId(),workspace.getId()).resources()).hasSize(3);
    }
    @Test void adjacentBlocksAreAllowedAndDeletionReopensSlot() {
        var saved=service.createBlocks(owner.getId(),workspace.getId(),input(openDesk.getId(),start,start.plusHours(1)));
        service.createBlocks(owner.getId(),workspace.getId(),input(openDesk.getId(),start.plusHours(1),start.plusHours(2)));
        assertThat(service.blocks(owner.getId(),workspace.getId(),start,start.plusHours(3))).hasSize(2);
        service.deleteBlock(owner.getId(),workspace.getId(),saved.get(0).id());em.flush();
        assertThat(blocks.findConflictingBlockedSlots(openDesk.getId(),start,start.plusHours(1))).isEmpty();
    }
    @Test void activeHoldPreventsCreatingABlock() {
        booking(BookingStatus.PENDING_PAYMENT,start,start.plusHours(1),LocalDateTime.of(2099,1,1,9,0));
        assertThatThrownBy(()->service.createBlocks(owner.getId(),workspace.getId(),input(openDesk.getId(),start,start.plusHours(1)))).isInstanceOf(ConflictException.class);
        assertThat(blocks.count()).isZero();
    }
    @Test void calendarIncludesBookingsStartedBeforeTheVisibleDay() {
        booking(BookingStatus.CONFIRMED,start.minusDays(1),start.plusHours(1),null);
        assertThat(bookings.findOrganizerCalendarBookings(owner.getId(),workspace.getId(),null,start,start.plusDays(1))).hasSize(1);
        assertThat(bookings.findOrganizerCalendarBookings(owner.getId(),workspace.getId(),null,start.plusHours(1),start.plusDays(1))).isEmpty();
    }
    @Test void ruleCrudPersistsScopeAndRejectsForeignOwner() {
        var input=new RuleInput("Weekend",desk.getResourceType().getId(),null,PricingModifierType.WEEKEND,null,null,null,null,new BigDecimal("1.20"),BigDecimal.ZERO,2,true);
        var saved=service.saveRule(owner.getId(),workspace.getId(),null,input);
        em.flush();em.clear();
        assertThat(service.pricing(owner.getId(),workspace.getId()).rules()).hasSize(1);
        assertThatThrownBy(()->service.deleteRule(owner.getId()+1,workspace.getId(),saved.id())).isInstanceOf(NotFoundException.class);
    }
    private void booking(BookingStatus status,LocalDateTime from,LocalDateTime to,LocalDateTime expiry) {
        var b=new BookingModel();b.setBookingCode("OPS-BOOKING");b.setWorkspace(workspace);b.setCustomer(owner);b.setResource(openDesk);b.setStartTime(from);b.setEndTime(to);b.setHoldExpiresAt(expiry);b.setStatus(status);b.setPriceType(PriceType.HOURLY);b.setBaseAmount(BigDecimal.TEN);b.setFinalPrice(BigDecimal.TEN);em.persist(b);em.flush();
    }
}
