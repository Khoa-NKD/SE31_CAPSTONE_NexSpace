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
@Import({OrganizerOperationsService.class,ResourceLockServiceImpl.class,
        base.api.feature.operations.service.MaintenanceScheduleService.class,
        base.api.feature.resource.service.PublicFloorMapService.class,
        base.api.feature.workspace.service.impl.WorkspaceAssetServiceImpl.class})
class OrganizerOperationsIntegrationTest {
    @Autowired EntityManager em;
    @Autowired OrganizerOperationsService service;
    @Autowired IResourceBlockedSlotRepository blocks;
    @Autowired IBookingRepository bookings;
    @Autowired IResourceLockService locks;
    @MockitoBean IAuditService audit;
    @MockitoBean base.api.shared.security.CurrentUserProvider currentUserProvider;
    @Autowired base.api.feature.workspace.service.IWorkspaceAssetService assets;
    @Autowired base.api.feature.workspace.repository.IAssetMaintenanceLogRepository maintenanceLogs;
    @Autowired base.api.feature.operations.service.MaintenanceScheduleService unified;
    @Autowired base.api.feature.resource.service.PublicFloorMapService publicMaps;
    @MockitoBean base.api.feature.organizer.repository.IOrganizerProfileRepository profiles;
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
    @Test void childMaintenanceReducesRoomCapacityWithoutPreventingRoomBooking() {
        room.getResourceType().setCapacity(10);
        service.createBlocks(owner.getId(),workspace.getId(),input(desk.getId(),start,start.plusHours(2)));
        em.flush();em.clear();
        assertThat(blocks.findConflictingBlockedSlots(room.getId(),start,start.plusHours(1))).hasSize(1);
        assertThat(blocks.findConflictingBlockedSlots(openDesk.getId(),start,start.plusHours(1))).isEmpty();
        assertThat(service.pricing(owner.getId(),workspace.getId()).resources()).hasSize(3);
        assertThat(locks.acquireResourceLock(room.getId(),start,start.plusHours(1)).getAvailableCapacity()).isEqualTo(9);
        assertThatThrownBy(()->locks.acquireResourceLock(desk.getId(),start,start.plusHours(1))).isInstanceOf(ConflictException.class);
    }
    @Test void removingRoomMaintenancePreservesIndependentChildSchedule() {
        room.getResourceType().setCapacity(10);
        service.createBlocks(owner.getId(),workspace.getId(),input(desk.getId(),start,start.plusHours(3)));
        var parent=service.createBlocks(owner.getId(),workspace.getId(),input(room.getId(),start,start.plusHours(2)));
        service.deleteBlock(owner.getId(),workspace.getId(),parent.get(0).id());
        em.flush();em.clear();
        assertThat(locks.acquireResourceLock(room.getId(),start,start.plusHours(1)).getAvailableCapacity()).isEqualTo(9);
        assertThatThrownBy(()->locks.acquireResourceLock(desk.getId(),start,start.plusHours(1))).isInstanceOf(ConflictException.class);
        assertThat(locks.acquireResourceLock(room.getId(),start.plusHours(3),start.plusHours(4)).getAvailableCapacity()).isEqualTo(10);
    }
    @Test void allSeatsUnderMaintenancePreventsRoomCheckout() {
        service.createBlocks(owner.getId(),workspace.getId(),input(desk.getId(),start,start.plusHours(2)));
        assertThatThrownBy(()->locks.acquireResourceLock(room.getId(),start,start.plusHours(1))).isInstanceOf(ConflictException.class);
    }
    @Test void timedEquipmentMaintenanceExpiresAtBoundaryAndCanBeCancelled() {
        var asset=new base.api.shared.entity.workspace.WorkspaceAssetModel();
        asset.setWorkspace(workspace);asset.setResource(room);asset.setAssetCode("PROJECTOR");asset.setName("Projector");
        em.persist(asset);em.flush();
        var now=LocalDateTime.now().withNano(0);
        var input=base.api.feature.workspace.dto.request.CreateMaintenanceLogDto.builder()
                .maintenanceType(MaintenanceType.REPAIR).status(MaintenanceStatus.SCHEDULED)
                .description("Scheduled repair").scheduledAt(now.minusHours(1)).plannedEndAt(now.plusHours(1)).build();
        var log=assets.createMaintenanceLog(workspace.getId(),asset.getId(),input,owner.getId());
        assertThat(assets.getAssetById(workspace.getId(),asset.getId(),owner.getId()).getStatus()).isEqualTo(AssetStatus.UNDER_MAINTENANCE);
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.IN_USE);
        assertThat(maintenanceLogs.findMaintainedAssetIds(workspace.getId(),now.plusHours(1),List.of(MaintenanceStatus.SCHEDULED,MaintenanceStatus.IN_PROGRESS))).isEmpty();
        assets.updateMaintenanceLog(workspace.getId(),asset.getId(),log.getId(),
                base.api.feature.workspace.dto.request.UpdateMaintenanceLogDto.builder().status(MaintenanceStatus.CANCELLED).build(),owner.getId());
        assertThat(assets.getAssetById(workspace.getId(),asset.getId(),owner.getId()).getStatus()).isEqualTo(AssetStatus.IN_USE);
    }
    @Test void roomMaintenanceIsInheritedByEquipmentWithoutMutatingAssetStatus() {
        var asset=new base.api.shared.entity.workspace.WorkspaceAssetModel();
        asset.setWorkspace(workspace);asset.setResource(desk);asset.setAssetCode("MONITOR");asset.setName("Monitor");
        em.persist(asset);
        var slot=new ResourceBlockedSlotModel();slot.setResource(room);slot.setCreatedBy(owner);
        slot.setBlockType(ResourceBlockType.MAINTENANCE);slot.setReason("Room maintenance");
        slot.setStartTime(LocalDateTime.now().minusHours(1));slot.setEndTime(LocalDateTime.now().plusHours(1));
        em.persist(slot);em.flush();
        assertThat(assets.getAssetById(workspace.getId(),asset.getId(),owner.getId()).getStatus()).isEqualTo(AssetStatus.UNDER_MAINTENANCE);
        service.deleteBlock(owner.getId(),workspace.getId(),slot.getId());em.flush();
        assertThat(assets.getAssetById(workspace.getId(),asset.getId(),owner.getId()).getStatus()).isEqualTo(AssetStatus.IN_USE);
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
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> maintenanceConflicts() {
        return java.util.stream.Stream.of(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN, BookingStatus.PENDING_APPROVAL)
                .flatMap(status -> java.util.stream.Stream.of("ROOM_TO_SEAT", "SEAT_TO_ROOM", "SAME_RESOURCE")
                        .map(relation -> org.junit.jupiter.params.provider.Arguments.of(status, relation)));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("maintenanceConflicts")
    void maintenanceRejectsOverlappingReservationsAcrossRoomHierarchy(BookingStatus status, String relation) {
        var booked = relation.equals("ROOM_TO_SEAT") ? room : relation.equals("SEAT_TO_ROOM") ? desk : openDesk;
        var target = relation.equals("ROOM_TO_SEAT") ? desk : relation.equals("SEAT_TO_ROOM") ? room : openDesk;
        booking(booked, status, start, start.plusHours(1), start.minusMinutes(1));
        assertThatThrownBy(() -> unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + target.getId()),
                        start.plusMinutes(15), start.plusMinutes(45), "Repair")))
                .isInstanceOf(ConflictException.class);
        assertThat(blocks.count()).isZero();
    }
    @Test void maintenanceUsesHalfOpenIntervalsAndDoesNotBlockExpiredHolds() {
        booking(BookingStatus.CONFIRMED, start, start.plusHours(1), null);
        service.createBlocks(owner.getId(), workspace.getId(), input(openDesk.getId(), start.minusHours(1), start));
        service.createBlocks(owner.getId(), workspace.getId(), input(openDesk.getId(), start.plusHours(1), start.plusHours(2)));
        assertThatThrownBy(() -> unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + openDesk.getId()),
                        start.minusMinutes(30), start.plusHours(2), "Repair")))
                .isInstanceOf(ConflictException.class);
        booking(desk, BookingStatus.PENDING_PAYMENT, start, start.plusHours(1), LocalDateTime.now().minusMinutes(1));
        assertThat(unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + desk.getId()),
                        start, start.plusHours(1), "Repair"))).hasSize(1);
    }
    @Test void legacyHoldWithoutExpiryAlsoPreventsMaintenanceAndBatchRemainsAtomic() {
        booking(BookingStatus.PENDING_PAYMENT, start, start.plusHours(1), null);
        assertThatThrownBy(() -> unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(
                        List.of("RESOURCE:" + room.getId(), "RESOURCE:" + openDesk.getId()),
                        start, start.plusHours(1), "Repair")))
                .isInstanceOf(ConflictException.class);
        assertThat(blocks.count()).isZero();
    }
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> checkoutCountdownConflicts() {
        return java.util.stream.Stream.of(BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_APPROVAL)
                .flatMap(status -> java.util.stream.Stream.of("ROOM_TO_SEAT", "SEAT_TO_ROOM", "SAME_RESOURCE")
                        .map(relation -> org.junit.jupiter.params.provider.Arguments.of(status, relation)));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("checkoutCountdownConflicts")
    void liveCheckoutCountdownPreventsMaintenanceBeforeTheReservedUsageStarts(BookingStatus status, String relation) {
        var booked = relation.equals("ROOM_TO_SEAT") ? room : relation.equals("SEAT_TO_ROOM") ? desk : openDesk;
        var target = relation.equals("ROOM_TO_SEAT") ? desk : relation.equals("SEAT_TO_ROOM") ? room : openDesk;
        var now = LocalDateTime.now().withNano(0);
        var expires = now.plusMinutes(15);
        booking(booked, status, start, start.plusHours(4), expires);
        assertThatThrownBy(() -> unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + target.getId()),
                        now.plusMinutes(2), now.plusMinutes(3), "Repair")))
                .isInstanceOf(ConflictException.class).hasMessageContaining("chờ thanh toán");
        assertThat(blocks.count()).isZero();
        assertThat(unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + target.getId()),
                        expires, expires.plusMinutes(1), "Repair"))).hasSize(1);
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
    @Test void unifiedScheduleGroupsAllTargetsAndCancelsTogether() {
        var floor = room.getFloorPlan();
        room.setPosX(BigDecimal.ZERO); room.setPosY(BigDecimal.ZERO);
        room.setWidth(new BigDecimal("500")); room.setHeight(new BigDecimal("500"));
        var item = new base.api.feature.resource.dto.FloorDecorations.Item("plant-1",
                base.api.feature.resource.dto.FloorDecorations.Kind.PLANT, "Plant", BigDecimal.TEN, BigDecimal.TEN,
                BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO, "#22cc88");
        floor.setLayoutJson(base.api.feature.resource.service.ResourceCanvas.writeDecorations(floor,
                new base.api.feature.resource.service.ResourceCanvas.Bounds(new BigDecimal("1000"), new BigDecimal("1000")), List.of(item), false));
        var asset = new base.api.shared.entity.workspace.WorkspaceAssetModel();
        asset.setWorkspace(workspace); asset.setResource(room); asset.setAssetCode("SCREEN"); asset.setName("Screen");
        em.persist(asset); em.flush();
        String furniture = "DECORATION:" + floor.getId() + ":plant-1";
        assertThat(unified.targets(owner.getId(), workspace.getId())).anySatisfy(t -> {
            assertThat(t.key()).isEqualTo(furniture); assertThat(t.parentRoomId()).isEqualTo(room.getId());
        });
        var result = unified.create(owner.getId(), workspace.getId(), new base.api.feature.operations.dto.MaintenanceDtos.Input(
                List.of("RESOURCE:" + desk.getId(), "ASSET:" + asset.getId(), furniture), start, start.plusHours(1), "Repair"));
        assertThat(result).hasSize(1);
        var group = result.get(0);
        assertThat(group.kind()).isEqualTo("GROUP");
        assertThat(group.targetKeys()).containsExactlyInAnyOrder("RESOURCE:" + desk.getId(), "ASSET:" + asset.getId(), furniture);
        unified.remove(owner.getId(), workspace.getId(), group.key());
        assertThat(unified.list(owner.getId(), workspace.getId(), start, start.plusHours(1))).isEmpty();
        assertThat(asset.getStatus()).isEqualTo(AssetStatus.IN_USE);
        assertThat(unified.list(owner.getId(), workspace.getId(), start.plusHours(1), start.plusHours(2))).isEmpty();
    }

    @Test void unifiedScheduleRejectsForeignOwnerAndExistingHolds() {
        assertThatThrownBy(() -> unified.create(owner.getId() + 1, workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + openDesk.getId()), start, start.plusHours(1), "Repair")))
                .isInstanceOf(NotFoundException.class);
        booking(BookingStatus.PENDING_PAYMENT, start, start.plusHours(1), start.plusHours(1));
        assertThatThrownBy(() -> unified.create(owner.getId(), workspace.getId(),
                new base.api.feature.operations.dto.MaintenanceDtos.Input(List.of("RESOURCE:" + openDesk.getId()), start, start.plusHours(1), "Repair")))
                .isInstanceOf(ConflictException.class);
        assertThat(blocks.count()).isZero();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(value = BookableResourceStatus.class,
            names = {"ACTIVE", "DISABLED", "DRAFT"})
    void customerMapRestoresOriginalActivationAfterMaintenanceEndsOrIsRemoved(BookableResourceStatus previous) {
        owner.setVerified(true);
        var profile = new base.api.shared.entity.organizer.OrganizerProfileModel();
        profile.setStatus(OrganizerProfileStatus.APPROVED);
        org.mockito.Mockito.when(profiles.findByOrganizerId(owner.getId())).thenReturn(Optional.of(profile));
        var floor = room.getFloorPlan(); floor.setStatus(FloorPlanStatus.PUBLISHED);
        var building = new BuildingModel(); building.setOrganizer(owner); building.setName("Test building");
        building.setAddress("Test address"); em.persist(building);
        var physical = new BuildingFloorModel(); physical.setBuilding(building); physical.setName("Floor 1");
        physical.setFloorNumber(1); physical.setCanvasWidth(new BigDecimal("1000"));
        physical.setCanvasHeight(new BigDecimal("1000")); em.persist(physical);
        floor.setBuildingFloor(physical);
        floor.setUsageX(BigDecimal.ZERO); floor.setUsageY(BigDecimal.ZERO);
        floor.setUsageWidth(new BigDecimal("1000")); floor.setUsageHeight(new BigDecimal("1000"));
        for (var r : List.of(room, desk, openDesk)) {
            r.setPosX(BigDecimal.ZERO); r.setPosY(BigDecimal.ZERO);
            r.setWidth(new BigDecimal("500")); r.setHeight(new BigDecimal("500")); r.setRotation(BigDecimal.ZERO);
        }
        floor.setPublishedGeometryJson(base.api.feature.resource.service.PublishedGeometry.snapshot(List.of(room, desk, openDesk)));
        // Maintenance overlays availability without overwriting either manual activation state.
        room.setStatus(previous);
        desk.setStatus(previous);
        var item = new base.api.feature.resource.dto.FloorDecorations.Item("plant-1",
                base.api.feature.resource.dto.FloorDecorations.Kind.PLANT, "Plant", BigDecimal.TEN, BigDecimal.TEN,
                BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO, "#22cc88");
        floor.setLayoutJson(base.api.feature.resource.service.ResourceCanvas.writeDecorations(floor,
                new base.api.feature.resource.service.ResourceCanvas.Bounds(new BigDecimal("1000"), new BigDecimal("1000")), List.of(item), false));
        var slot = new ResourceBlockedSlotModel(); slot.setResource(room); slot.setCreatedBy(owner);
        slot.setBlockType(ResourceBlockType.MAINTENANCE); slot.setReason("Room repair");
        slot.setStartTime(LocalDateTime.now().minusHours(1)); slot.setEndTime(LocalDateTime.now().plusHours(1)); em.persist(slot); em.flush();
        var hidden = publicMaps.maps(workspace.getId()).get(0);
        assertThat(hidden.resources()).hasSize(3);
        assertThat(hidden.resources()).filteredOn(r -> r.id().equals(room.getId()) || r.id().equals(desk.getId()))
                .allMatch(r -> !r.selectable() && r.state() == base.api.feature.resource.dto.FloorManagement.AvailabilityState.MAINTENANCE);
        assertThat(hidden.decorations()).hasSize(1);
        assertThat(hidden.decorations().get(0).color()).isEqualTo("#a855f7");
        var expected = previous == BookableResourceStatus.ACTIVE
                ? base.api.feature.resource.dto.FloorManagement.AvailabilityState.AVAILABLE
                : base.api.feature.resource.dto.FloorManagement.AvailabilityState.DISABLED;
        // Expiry is half-open and reveals the original state without a scheduler or status write.
        slot.setStartTime(LocalDateTime.now().minusHours(2));
        slot.setEndTime(LocalDateTime.now().minusHours(1)); em.flush();
        var expired = publicMaps.maps(workspace.getId()).get(0);
        assertThat(expired.resources()).filteredOn(r -> r.id().equals(room.getId()) || r.id().equals(desk.getId()))
                .allMatch(r -> r.state() == expected);
        assertThat(room.getStatus()).isEqualTo(previous);
        assertThat(desk.getStatus()).isEqualTo(previous);
        slot.setEndTime(LocalDateTime.now().plusHours(1)); em.flush();
        unified.remove(owner.getId(), workspace.getId(), "RESOURCE:" + slot.getId()); em.flush();
        var restored = publicMaps.maps(workspace.getId()).get(0);
        assertThat(restored.resources()).hasSize(3); assertThat(restored.decorations()).hasSize(1);
        assertThat(restored.decorations().get(0).color()).isEqualTo("#22cc88");
        assertThat(restored.resources()).filteredOn(r -> r.id().equals(room.getId()) || r.id().equals(desk.getId()))
                .allMatch(r -> r.state() == expected);
        assertThat(restored.resources()).filteredOn(r -> r.id().equals(room.getId())).singleElement()
                .satisfies(r -> assertThat(r.selectable()).isEqualTo(previous == BookableResourceStatus.ACTIVE));
        assertThat(room.getStatus()).isEqualTo(previous);
        assertThat(desk.getStatus()).isEqualTo(previous);
    }

    private void booking(BookingStatus status,LocalDateTime from,LocalDateTime to,LocalDateTime expiry) {
        booking(openDesk, status, from, to, expiry);
    }
    private void booking(BookableResourceModel resource, BookingStatus status,LocalDateTime from,LocalDateTime to,LocalDateTime expiry) {
        var b=new BookingModel();b.setBookingCode("OPS-BOOKING-" + resource.getId());b.setWorkspace(workspace);b.setCustomer(owner);b.setResource(resource);b.setStartTime(from);b.setEndTime(to);b.setHoldExpiresAt(expiry);b.setStatus(status);b.setPriceType(PriceType.HOURLY);b.setBaseAmount(BigDecimal.TEN);b.setFinalPrice(BigDecimal.TEN);em.persist(b);em.flush();
    }
}
