package base.api.feature.resource;

import static org.assertj.core.api.Assertions.*;

import base.api.feature.resource.dto.FloorManagement;
import base.api.feature.resource.dto.ResourceRequests.*;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.OrganizerResourceService;
import base.api.feature.resource.service.ResourceCanvas;
import base.api.shared.entity.*;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.*;

/** Explicit in-memory H2 configuration: never imports Local or starts seeds/mail. */
@DataJpaTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:resource_management;MODE=MySQL;DB_CLOSE_DELAY=-1",
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
    OrganizerResourceService.class,
    base.api.feature.resource.repository.ResourceUsageRepository.class,
    base.api.feature.resource.service.PublicFloorMapService.class,
    OrganizerResourceDatabaseTest.TestClock.class
})
class OrganizerResourceDatabaseTest {

    @Test
    void publishedFloorRenamePreservesGeometryAndRejectsStaleOrForeignUpdates() {
        var resource = service.create(owner.getId(), workspace.getId(), input("RENAME-SEAT", null));
        var original = floor.getLayoutJson();
        var revision =
                service.floorLayout(owner.getId(), workspace.getId(), floor.getId())
                        .floor()
                        .revision();
        var renamed =
                service.renameFloor(
                        owner.getId(),
                        workspace.getId(),
                        floor.getId(),
                        new FloorManagement.Rename("Renamed floor", revision));
        assertThat(renamed.status()).isEqualTo(FloorPlanStatus.PUBLISHED);
        assertThat(renamed.floorNumber()).isEqualTo(1);
        assertThat(floor.getLayoutJson()).isEqualTo(original);
        assertThat(service.detail(owner.getId(), resource.id()).posX()).isEqualByComparingTo("10");
        assertThatThrownBy(
                        () ->
                                service.renameFloor(
                                        other.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        new FloorManagement.Rename("Foreign", renamed.revision())))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(
                        () ->
                                service.renameFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        new FloorManagement.Rename("Stale", "old")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void copyingFloorRemapsRoomLinksAndFurnitureWithoutCopyingBookingsOrBlocks() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "COPY-SEAT", null));
        var table = tableDecoration("Table", "180");
        floor.setDraftLayoutJson(
                ResourceCanvas.writeDecorations(
                        floor, ResourceCanvas.read(floor), java.util.List.of(table)));
        liveBookingFor(desk.id());
        calendarBlock(
                em.find(BookableResourceModel.class, desk.id()), ResourceBlockType.MAINTENANCE);
        em.flush();
        var source = service.floorLayout(owner.getId(), workspace.getId(), floor.getId());
        var copied =
                service.copyFloor(
                        owner.getId(),
                        workspace.getId(),
                        floor.getId(),
                        new FloorManagement.Copy("Copy", 2, source.floor().revision()));
        assertThat(copied.status()).isEqualTo(FloorPlanStatus.DRAFT);
        var clone = service.floorLayout(owner.getId(), workspace.getId(), copied.id());
        assertThat(clone.resources())
                .hasSize(2)
                .allMatch(item -> item.status() == BookableResourceStatus.DRAFT);
        var newRoom =
                clone.resources().stream()
                        .filter(item -> item.category() == ResourceCategory.ROOM)
                        .findFirst()
                        .orElseThrow();
        var newDesk =
                clone.resources().stream()
                        .filter(item -> item.category() == ResourceCategory.DESK)
                        .findFirst()
                        .orElseThrow();
        assertThat(newRoom.id()).isNotEqualTo(room.id());
        assertThat(newDesk.parentRoomId()).isEqualTo(newRoom.id());
        assertThat(newDesk.id()).isNotEqualTo(desk.id());
        assertThat(newDesk.posX()).isEqualByComparingTo(desk.posX());
        assertThat(clone.decorations().get(0).id()).isNotEqualTo(table.id());
        assertThat(clone.decorations().get(0).width()).isEqualByComparingTo(table.width());
        assertThat(
                        em.createQuery(
                                        "select count(b) from BookingModel b where"
                                            + " b.resource.floorPlan.id=:floor",
                                        Long.class)
                                .setParameter("floor", copied.id())
                                .getSingleResult())
                .isZero();
        assertThat(
                        em.createQuery(
                                        "select count(b) from ResourceBlockedSlotModel b where"
                                            + " b.resource.floorPlan.id=:floor",
                                        Long.class)
                                .setParameter("floor", copied.id())
                                .getSingleResult())
                .isZero();
        assertThat(floor.getStatus()).isEqualTo(FloorPlanStatus.PUBLISHED);
        assertThatThrownBy(
                        () ->
                                service.copyFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        new FloorManagement.Copy(
                                                "Duplicate", 2, source.floor().revision())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void floorDeletionRequiresOwnershipRevisionAndAnEntirelyEmptyFloor() {
        var blank = service.createFloor(owner.getId(), workspace.getId(), new Floor("Empty", 2));
        assertThatThrownBy(
                        () ->
                                service.deleteFloor(
                                        other.getId(),
                                        workspace.getId(),
                                        blank.id(),
                                        blank.revision()))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(
                        () ->
                                service.deleteFloor(
                                        owner.getId(), workspace.getId(), blank.id(), "stale"))
                .isInstanceOf(ConflictException.class);
        service.deleteFloor(owner.getId(), workspace.getId(), blank.id(), blank.revision());
        assertThat(em.find(FloorPlanModel.class, blank.id())).isNull();
        var resource = service.create(owner.getId(), workspace.getId(), input("RETAINED", null));
        em.find(BookableResourceModel.class, resource.id())
                .setStatus(BookableResourceStatus.ARCHIVED);
        em.flush();
        var revision =
                service.floorLayout(owner.getId(), workspace.getId(), floor.getId())
                        .floor()
                        .revision();
        assertThatThrownBy(
                        () ->
                                service.deleteFloor(
                                        owner.getId(), workspace.getId(), floor.getId(), revision))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("resources");
    }

    @Test
    void deletionPreservesPublishedAndDraftFurnitureAndUnknownLayoutMetadata() {
        assertThat(
                        ResourceCanvas.simpleLayout(
                                ResourceCanvas.write(new BigDecimal("1200"), new BigDecimal("800")),
                                true))
                .isTrue();
        assertThat(ResourceCanvas.simpleLayout("{\"schema\":\"other-editor\",\"walls\":[1]}", true))
                .isFalse();
        floor.setDraftLayoutJson(
                ResourceCanvas.writeDecorations(
                        floor,
                        ResourceCanvas.read(floor),
                        java.util.List.of(tableDecoration("Table", "180"))));
        em.flush();
        var revision =
                service.floorLayout(owner.getId(), workspace.getId(), floor.getId())
                        .floor()
                        .revision();
        assertThatThrownBy(
                        () ->
                                service.deleteFloor(
                                        owner.getId(), workspace.getId(), floor.getId(), revision))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("layout data");
    }

    BookingModel periodBooking(
            BookableResourceModel resource,
            BookingStatus status,
            LocalDateTime start,
            LocalDateTime end,
            LocalDateTime expiry) {
        var booking = new BookingModel();
        booking.setBookingCode("PERIOD-" + java.util.UUID.randomUUID().toString().substring(0, 12));
        booking.setResource(resource);
        booking.setWorkspace(workspace);
        booking.setCustomer(other);
        booking.setStatus(status);
        booking.setStartTime(start);
        booking.setEndTime(end);
        booking.setHoldExpiresAt(expiry);
        booking.setPriceType(PriceType.HOURLY);
        booking.setBaseAmount(new BigDecimal("50000"));
        booking.setFinalPrice(new BigDecimal("50000"));
        em.persist(booking);
        return booking;
    }

    void calendarBlock(BookableResourceModel resource, ResourceBlockType blockType) {
        var block = new ResourceBlockedSlotModel();
        block.setResource(resource);
        block.setCreatedBy(owner);
        block.setStartTime(LocalDateTime.of(2026, 11, 7, 1, 0));
        block.setEndTime(block.getStartTime().plusHours(1));
        block.setBlockType(blockType);
        block.setReason("Maintenance wording does not determine classification");
        em.persist(block);
    }

    @Test
    void availabilityUsesUtcHalfOpenIntervalsExpiringHoldsAndTypedMaintenance() {
        var start = LocalDateTime.of(2026, 11, 7, 1, 0);
        var end = start.plusHours(1);
        var rows = new java.util.ArrayList<BookableResourceModel>();
        for (int i = 0; i < 7; i++) {
            var row = new BookableResourceModel();
            row.setFloorPlan(floor);
            row.setResourceType(type);
            row.setLabel("STATE-" + i);
            row.setPosX(BigDecimal.valueOf(10 + i * 80));
            row.setPosY(new BigDecimal("20"));
            row.setWidth(new BigDecimal("40"));
            row.setHeight(new BigDecimal("40"));
            row.setStatus(BookableResourceStatus.ACTIVE);
            em.persist(row);
            rows.add(row);
        }
        periodBooking(rows.get(0), BookingStatus.CONFIRMED, start, end, null);
        periodBooking(
                rows.get(1),
                BookingStatus.PENDING_PAYMENT,
                start,
                end,
                LocalDateTime.of(2026, 11, 6, 0, 10));
        periodBooking(
                rows.get(2),
                BookingStatus.PENDING_PAYMENT,
                start,
                end,
                LocalDateTime.of(2026, 11, 5, 23, 59));
        periodBooking(rows.get(2), BookingStatus.CONFIRMED, start.minusHours(1), start, null);
        calendarBlock(rows.get(3), ResourceBlockType.MAINTENANCE);
        rows.get(4).setStatus(BookableResourceStatus.DISABLED);
        calendarBlock(rows.get(5), ResourceBlockType.BLOCKED);
        periodBooking(rows.get(6), BookingStatus.CANCELLED, start, end, null);
        em.flush();
        var snapshot =
                service.availability(
                        owner.getId(),
                        workspace.getId(),
                        floor.getId(),
                        OffsetDateTime.parse("2026-11-07T08:00:00+07:00"),
                        OffsetDateTime.parse("2026-11-07T09:00:00+07:00"));
        assertThat(snapshot.from().getHour()).isEqualTo(1);
        assertThat(snapshot.resources())
                .extracting(item -> item.state())
                .containsExactly(
                        FloorManagement.AvailabilityState.BOOKED,
                        FloorManagement.AvailabilityState.LOCKED,
                        FloorManagement.AvailabilityState.AVAILABLE,
                        FloorManagement.AvailabilityState.MAINTENANCE,
                        FloorManagement.AvailabilityState.DISABLED,
                        FloorManagement.AvailabilityState.LOCKED,
                        FloorManagement.AvailabilityState.AVAILABLE);
        assertThat(
                        em.find(
                                        BookingModel.class,
                                        em.createQuery(
                                                        "select b.id from BookingModel b where"
                                                            + " b.resource.id=:id",
                                                        Long.class)
                                                .setParameter("id", rows.get(1).getId())
                                                .getSingleResult())
                                .getStatus())
                .isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThatThrownBy(
                        () ->
                                service.availability(
                                        other.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        snapshot.from(),
                                        snapshot.to()))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(
                        () ->
                                service.availability(
                                        owner.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        snapshot.to(),
                                        snapshot.from()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void roomAndDeskCalendarSignalsPropagateWithoutChangingOperationalStatuses() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "TIME-DESK", null));
        var start = LocalDateTime.of(2026, 11, 7, 1, 0);
        var end = start.plusHours(1);
        var booking =
                periodBooking(
                        em.find(BookableResourceModel.class, room.id()),
                        BookingStatus.CONFIRMED,
                        start,
                        end,
                        null);
        em.flush();
        var from = start.atOffset(ZoneOffset.UTC);
        var to = end.atOffset(ZoneOffset.UTC);
        assertThat(
                        service.availability(
                                        owner.getId(), workspace.getId(), floor.getId(), from, to)
                                .resources())
                .allMatch(item -> item.state() == FloorManagement.AvailabilityState.BOOKED);
        booking.setStatus(BookingStatus.CANCELLED);
        calendarBlock(
                em.find(BookableResourceModel.class, desk.id()), ResourceBlockType.MAINTENANCE);
        em.flush();
        assertThat(
                        service.availability(
                                        owner.getId(), workspace.getId(), floor.getId(), from, to)
                                .resources())
                .allMatch(item -> item.state() == FloorManagement.AvailabilityState.MAINTENANCE);
        assertThat(service.detail(owner.getId(), desk.id()).status())
                .isEqualTo(BookableResourceStatus.DRAFT);
    }

    @TestConfiguration
    static class TestClock {
        @Bean
        Clock organizerApplicationClock() {
            return Clock.fixed(Instant.parse("2026-11-06T00:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired EntityManager em;
    @Autowired OrganizerResourceService service;
    @Autowired IBookableResourceRepository resources;
    @Autowired base.api.feature.resource.service.PublicFloorMapService publicMaps;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    UserModel owner, other;
    WorkspaceModel workspace;
    FloorPlanModel floor;
    ResourceTypeModel type;

    @BeforeEach
    void seedOnlyInMemory() {
        String databaseUrl =
                em.unwrap(org.hibernate.Session.class)
                        .doReturningWork(connection -> connection.getMetaData().getURL());
        assertThat(databaseUrl).startsWith("jdbc:h2:mem:");
        var role = new RoleModel("ORGANIZER", null);
        em.persist(role);
        owner = account("owner", role);
        other = account("other", role);
        var otherProfile = new OrganizerProfileModel();
        otherProfile.setOrganizer(other);
        otherProfile.setStatus(OrganizerProfileStatus.APPROVED);
        em.persist(otherProfile);
        var profile = new OrganizerProfileModel();
        profile.setOrganizer(owner);
        profile.setStatus(OrganizerProfileStatus.APPROVED);
        em.persist(profile);
        workspace = new WorkspaceModel();
        workspace.setOrganizer(owner);
        workspace.setName("Example workspace");
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        em.persist(workspace);
        floor = new FloorPlanModel();
        floor.setWorkspace(workspace);
        floor.setName("Ground floor");
        floor.setFloorNumber(1);
        floor.setStatus(FloorPlanStatus.PUBLISHED);
        floor.setLayoutJson(
                base.api.feature.resource.service.ResourceCanvas.write(
                        new BigDecimal("1200"), new BigDecimal("800")));
        em.persist(floor);
        type = new ResourceTypeModel();
        type.setWorkspace(workspace);
        type.setName("Desk VND");
        type.setCategory(ResourceCategory.DESK);
        type.setCurrency(ResourceCurrency.VND);
        type.setPricePerHour(new BigDecimal("50000.00"));
        em.persist(type);
        em.flush();
    }

    UserModel account(String name, RoleModel role) {
        var user = new UserModel();
        user.setUserName(name);
        user.setEmail(name + "@example.test");
        user.setPassword("test-only");
        user.setRoleEntity(role);
        user.setVerified(true);
        em.persist(user);
        return user;
    }

    Input input(String code, String revision) {
        return new Input(
                floor.getId(),
                type.getId(),
                code,
                "Window desk",
                "Quiet zone",
                NoiseLevel.QUIET,
                null,
                null,
                "Near the window",
                new BigDecimal("10"),
                new BigDecimal("20"),
                new BigDecimal("40"),
                new BigDecimal("40"),
                BigDecimal.ZERO,
                revision);
    }

    @ParameterizedTest
    @EnumSource(
            value = WorkspaceStatus.class,
            names = {"DRAFT", "ACTIVE", "INACTIVE"})
    void configurableWorkspacesAllowDraftPreparationButOnlyActiveCanEnable(WorkspaceStatus status) {
        workspace.setStatus(status);
        em.flush();
        var newFloor =
                service.createFloor(owner.getId(), workspace.getId(), new Floor("Test floor", 2));
        var layout = service.floorLayout(owner.getId(), workspace.getId(), newFloor.id());
        var published =
                service.publishFloor(
                        owner.getId(),
                        workspace.getId(),
                        newFloor.id(),
                        new PublishFloor(
                                layout.floor().revision(),
                                new BigDecimal("800"),
                                new BigDecimal("600"),
                                true,
                                java.util.List.of()));
        assertThat(published.floor().status()).isEqualTo(FloorPlanStatus.PUBLISHED);
        var created = service.create(owner.getId(), workspace.getId(), input("STATE-01", null));
        assertThat(created.status()).isEqualTo(BookableResourceStatus.DRAFT);
        if (status == WorkspaceStatus.ACTIVE) {
            assertThat(
                            service.status(
                                            owner.getId(),
                                            created.id(),
                                            new Status(
                                                    BookableResourceStatus.ACTIVE,
                                                    created.revision()))
                                    .status())
                    .isEqualTo(BookableResourceStatus.ACTIVE);
        } else {
            assertThatThrownBy(
                            () ->
                                    service.status(
                                            owner.getId(),
                                            created.id(),
                                            new Status(
                                                    BookableResourceStatus.ACTIVE,
                                                    created.revision())))
                    .isInstanceOf(ConflictException.class);
        }
    }

    @ParameterizedTest
    @EnumSource(
            value = WorkspaceStatus.class,
            names = {"PENDING_REVIEW", "REJECTED", "SUSPENDED", "ARCHIVED"})
    void readOnlyWorkspaceStatesRejectAllConfigurationWrites(WorkspaceStatus status) {
        var created = service.create(owner.getId(), workspace.getId(), input("LOCKED-01", null));
        var newFloor =
                service.createFloor(owner.getId(), workspace.getId(), new Floor("Test floor", 2));
        var layout = service.floorLayout(owner.getId(), workspace.getId(), newFloor.id());
        var typeRequest =
                new Type(
                        "Desk configuration",
                        ResourceCategory.DESK,
                        ResourceCurrency.VND,
                        1,
                        new BigDecimal("50000"),
                        null,
                        null,
                        base.api.feature.resource.dto.ResourceResponses.revision(type));
        workspace.setStatus(status);
        em.flush();
        assertThat(service.options(owner.getId(), workspace.getId()).workspaceStatus())
                .isEqualTo(status);
        assertThat(service.detail(owner.getId(), created.id()).id()).isEqualTo(created.id());
        assertThat(
                        service.floorLayout(owner.getId(), workspace.getId(), newFloor.id())
                                .floor()
                                .id())
                .isEqualTo(newFloor.id());
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(), workspace.getId(), input("LOCKED-02", null)))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.update(
                                        owner.getId(),
                                        created.id(),
                                        input("LOCKED-01", created.revision())))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        created.id(),
                                        new Status(
                                                BookableResourceStatus.DISABLED,
                                                created.revision())))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.delete(owner.getId(), created.id(), created.revision()))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.createFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        new Floor("Blocked floor", 3)))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.updateFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        newFloor.id(),
                                        new Floor("Blocked rename", 2),
                                        newFloor.revision()))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.createType(owner.getId(), workspace.getId(), typeRequest))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.updateType(
                                        owner.getId(),
                                        workspace.getId(),
                                        type.getId(),
                                        typeRequest))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.publishFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        newFloor.id(),
                                        new PublishFloor(
                                                layout.floor().revision(),
                                                new BigDecimal("800"),
                                                new BigDecimal("600"),
                                                true,
                                                java.util.List.of())))
                .isInstanceOf(ConflictException.class);
        assertThat(resources.findById(created.id())).isPresent();
        assertThat(
                        service.floorLayout(owner.getId(), workspace.getId(), newFloor.id())
                                .floor()
                                .status())
                .isEqualTo(FloorPlanStatus.DRAFT);
    }

    @Test
    void createsDraftPersistsSeparateCodeNameAndCurrencyThenEnablesAndDisables() {
        var resource = service.create(owner.getId(), workspace.getId(), input("a-01", null));
        assertThat(resource.code()).isEqualTo("A-01");
        assertThat(resource.name()).isEqualTo("Window desk");
        assertThat(resource.status()).isEqualTo(BookableResourceStatus.DRAFT);
        assertThat(resource.effectivePricePerHour()).isEqualByComparingTo("50000");
        assertThat(resource.currency()).isEqualTo(ResourceCurrency.VND);
        var active =
                service.status(
                        owner.getId(),
                        resource.id(),
                        new Status(BookableResourceStatus.ACTIVE, resource.revision()));
        assertThat(active.status()).isEqualTo(BookableResourceStatus.ACTIVE);
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        resource.id(),
                                        new Status(
                                                BookableResourceStatus.DISABLED,
                                                resource.revision())))
                .isInstanceOf(ConflictException.class);
        assertThat(
                        service.status(
                                        owner.getId(),
                                        resource.id(),
                                        new Status(
                                                BookableResourceStatus.DISABLED, active.revision()))
                                .status())
                .isEqualTo(BookableResourceStatus.DISABLED);
    }

    @Test
    void duplicateCodeOwnershipAndUnpublishedFloorsCannotBypassRules() {
        var resource = service.create(owner.getId(), workspace.getId(), input("A-02", null));
        assertThatThrownBy(
                        () -> service.create(owner.getId(), workspace.getId(), input("a-02", null)))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.detail(other.getId(), resource.id()))
                .isInstanceOf(NotFoundException.class);
        floor.setStatus(FloorPlanStatus.DRAFT);
        em.flush();
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        resource.id(),
                                        new Status(
                                                BookableResourceStatus.ACTIVE,
                                                resource.revision())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void bookingHistoryBlocksDeletionAndLiveBookingBlocksStructuralChangesButNotDisable() {
        var resource = service.create(owner.getId(), workspace.getId(), input("A-03", null));
        var booking = new BookingModel();
        booking.setBookingCode("TEST-BOOKING");
        booking.setCustomer(other);
        booking.setResource(em.find(BookableResourceModel.class, resource.id()));
        booking.setWorkspace(workspace);
        booking.setStartTime(LocalDateTime.of(2026, 11, 7, 1, 0));
        booking.setEndTime(booking.getStartTime().plusHours(1));
        booking.setPriceType(PriceType.HOURLY);
        booking.setBaseAmount(new BigDecimal("50000"));
        booking.setFinalPrice(new BigDecimal("50000"));
        booking.setStatus(BookingStatus.CONFIRMED);
        em.persist(booking);
        em.flush();
        assertThatThrownBy(() -> service.delete(owner.getId(), resource.id(), resource.revision()))
                .isInstanceOf(ConflictException.class);
        var changed =
                new Input(
                        floor.getId(),
                        type.getId(),
                        "A-03",
                        "Window desk",
                        null,
                        null,
                        null,
                        null,
                        null,
                        new BigDecimal("11"),
                        new BigDecimal("20"),
                        null,
                        null,
                        BigDecimal.ZERO,
                        resource.revision());
        assertThatThrownBy(() -> service.update(owner.getId(), resource.id(), changed))
                .isInstanceOf(ConflictException.class);
        assertThat(
                        service.status(
                                        owner.getId(),
                                        resource.id(),
                                        new Status(
                                                BookableResourceStatus.DISABLED,
                                                resource.revision()))
                                .status())
                .isEqualTo(BookableResourceStatus.DISABLED);
        em.refresh(booking);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(booking.getFinalPrice()).isEqualByComparingTo("50000");
        booking.setStatus(BookingStatus.CANCELLED);
        em.flush();
        assertThatThrownBy(
                        () ->
                                service.delete(
                                        owner.getId(),
                                        resource.id(),
                                        service.detail(owner.getId(), resource.id()).revision()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void unusedResourceCanBeDeletedAndDifferentWorkspaceTypeIsRejected() {
        var resource = service.create(owner.getId(), workspace.getId(), input("A-04", null));
        service.delete(owner.getId(), resource.id(), resource.revision());
        assertThat(resources.findById(resource.id())).isEmpty();
        var foreign = new WorkspaceModel();
        foreign.setOrganizer(other);
        foreign.setName("Foreign");
        em.persist(foreign);
        type.setWorkspace(foreign);
        em.flush();
        assertThatThrownBy(
                        () -> service.create(owner.getId(), workspace.getId(), input("A-05", null)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void setupAndCurrencyAreRealAndLegacyCurrencyIsNotGuessed() {
        var newFloor =
                service.createFloor(owner.getId(), workspace.getId(), new Floor("Upper floor", 2));
        assertThat(newFloor.status()).isEqualTo(FloorPlanStatus.DRAFT);
        var usd =
                service.createType(
                        owner.getId(),
                        workspace.getId(),
                        new Type(
                                "Room USD",
                                ResourceCategory.ROOM,
                                ResourceCurrency.USD,
                                6,
                                new BigDecimal("12.50"),
                                null,
                                null,
                                null));
        assertThat(usd.currency()).isEqualTo(ResourceCurrency.USD);
        assertThatThrownBy(
                        () ->
                                service.updateType(
                                        owner.getId(),
                                        workspace.getId(),
                                        usd.id(),
                                        new Type(
                                                "Room USD",
                                                ResourceCategory.ROOM,
                                                ResourceCurrency.VND,
                                                6,
                                                new BigDecimal("12.50"),
                                                null,
                                                null,
                                                usd.revision())))
                .isInstanceOf(ConflictException.class);
        type.setCurrency(null);
        em.flush();
        assertThatThrownBy(
                        () -> service.create(owner.getId(), workspace.getId(), input("A-06", null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void publishingValidatesBoundsAndSnapshotsThenAllowsSeparateActivation() {
        var createdFloor =
                service.createFloor(owner.getId(), workspace.getId(), new Floor("New canvas", 3));
        var placed =
                service.create(
                        owner.getId(),
                        workspace.getId(),
                        new Input(
                                createdFloor.id(),
                                type.getId(),
                                "N-01",
                                "New desk",
                                null,
                                null,
                                null,
                                null,
                                null,
                                new BigDecimal("100"),
                                new BigDecimal("10"),
                                new BigDecimal("40"),
                                new BigDecimal("40"),
                                BigDecimal.ZERO,
                                null));
        var snapshot = java.util.List.of(new ResourceRevision(placed.id(), placed.revision()));
        assertThatThrownBy(
                        () ->
                                service.publishFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        createdFloor.id(),
                                        new PublishFloor(
                                                createdFloor.revision(),
                                                new BigDecimal("100"),
                                                new BigDecimal("100"),
                                                true,
                                                snapshot)))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.publishFloor(
                                        owner.getId(),
                                        workspace.getId(),
                                        createdFloor.id(),
                                        new PublishFloor(
                                                createdFloor.revision(),
                                                new BigDecimal("1200"),
                                                new BigDecimal("800"),
                                                true,
                                                java.util.List.of())))
                .isInstanceOf(ConflictException.class);
        var published =
                service.publishFloor(
                        owner.getId(),
                        workspace.getId(),
                        createdFloor.id(),
                        new PublishFloor(
                                createdFloor.revision(),
                                new BigDecimal("1200"),
                                new BigDecimal("800"),
                                true,
                                snapshot));
        assertThat(published.floor().status()).isEqualTo(FloorPlanStatus.PUBLISHED);
        assertThat(service.detail(owner.getId(), placed.id()).status())
                .isEqualTo(BookableResourceStatus.DRAFT);
        assertThat(
                        service.status(
                                        owner.getId(),
                                        placed.id(),
                                        new Status(
                                                BookableResourceStatus.ACTIVE, placed.revision()))
                                .status())
                .isEqualTo(BookableResourceStatus.ACTIVE);
    }

    base.api.feature.resource.dto.ResourceResponses.Detail room() {
        var roomType = new ResourceTypeModel();
        roomType.setWorkspace(workspace);
        roomType.setName("Meeting room");
        roomType.setCategory(ResourceCategory.ROOM);
        roomType.setCapacity(4);
        roomType.setCurrency(ResourceCurrency.VND);
        roomType.setPricePerHour(new BigDecimal("150000"));
        em.persist(roomType);
        em.flush();
        return service.create(
                owner.getId(),
                workspace.getId(),
                new Input(
                        floor.getId(),
                        roomType.getId(),
                        "ROOM-01",
                        "Meeting room",
                        null,
                        null,
                        null,
                        null,
                        null,
                        new BigDecimal("100"),
                        new BigDecimal("100"),
                        new BigDecimal("240"),
                        new BigDecimal("180"),
                        BigDecimal.ZERO,
                        null));
    }

    Input deskIn(Long parent, String code, String revision) {
        return new Input(
                floor.getId(),
                type.getId(),
                code,
                "Room desk",
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("120"),
                new BigDecimal("120"),
                new BigDecimal("40"),
                new BigDecimal("40"),
                BigDecimal.ZERO,
                revision,
                parent);
    }

    void liveBookingFor(Long resourceId) {
        var booking = new BookingModel();
        booking.setBookingCode("FAMILY-" + resourceId);
        booking.setCustomer(other);
        booking.setResource(em.find(BookableResourceModel.class, resourceId));
        booking.setWorkspace(workspace);
        booking.setStartTime(LocalDateTime.of(2026, 11, 7, 1, 0));
        booking.setEndTime(booking.getStartTime().plusHours(1));
        booking.setPriceType(PriceType.HOURLY);
        booking.setBaseAmount(new BigDecimal("50000"));
        booking.setFinalPrice(new BigDecimal("50000"));
        booking.setStatus(BookingStatus.CONFIRMED);
        em.persist(booking);
        em.flush();
    }

    @Test
    void openDesksAndRoomDesksAreExplicitAndRoomDeletionIsRestricted() {
        var room = room();
        var open = service.create(owner.getId(), workspace.getId(), input("OPEN-01", null));
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        assertThat(open.parentRoomId()).isNull();
        assertThat(desk.parentRoomId()).isEqualTo(room.id());
        assertThat(desk.parentRoomName()).isEqualTo("Meeting room");
        assertThat(service.options(owner.getId(), workspace.getId()).rooms())
                .extracting(r -> r.id())
                .containsExactly(room.id());
        assertThatThrownBy(
                        () ->
                                service.delete(
                                        owner.getId(),
                                        room.id(),
                                        service.detail(owner.getId(), room.id()).revision()))
                .isInstanceOf(ConflictException.class);
        service.delete(owner.getId(), desk.id(), desk.revision());
        service.delete(
                owner.getId(), room.id(), service.detail(owner.getId(), room.id()).revision());
        assertThat(resources.findById(open.id())).isPresent();
    }

    @Test
    void roomSalesAndContainedDeskSalesCannotBeActiveTogether() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        var activeDesk =
                service.status(
                        owner.getId(),
                        desk.id(),
                        new Status(BookableResourceStatus.ACTIVE, desk.revision()));
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        room.id(),
                                        new Status(
                                                BookableResourceStatus.ACTIVE,
                                                service.detail(owner.getId(), room.id())
                                                        .revision())))
                .isInstanceOf(ConflictException.class);
        var disabledDesk =
                service.status(
                        owner.getId(),
                        desk.id(),
                        new Status(BookableResourceStatus.DISABLED, activeDesk.revision()));
        assertThat(
                        service.status(
                                        owner.getId(),
                                        room.id(),
                                        new Status(
                                                BookableResourceStatus.ACTIVE,
                                                service.detail(owner.getId(), room.id())
                                                        .revision()))
                                .status())
                .isEqualTo(BookableResourceStatus.ACTIVE);
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        desk.id(),
                                        new Status(
                                                BookableResourceStatus.ACTIVE,
                                                disabledDesk.revision())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void liveDeskBookingBlocksWholeRoomActivationAndDeskRelocation() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        liveBookingFor(desk.id());
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        room.id(),
                                        new Status(
                                                BookableResourceStatus.ACTIVE,
                                                service.detail(owner.getId(), room.id())
                                                        .revision())))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.update(
                                        owner.getId(),
                                        desk.id(),
                                        deskIn(null, "SEAT-01", desk.revision())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void liveWholeRoomBookingBlocksDeskActivationEvenAfterRoomIsDisabled() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        liveBookingFor(room.id());
        var disabled =
                service.status(
                        owner.getId(),
                        room.id(),
                        new Status(
                                BookableResourceStatus.DISABLED,
                                service.detail(owner.getId(), room.id()).revision()));
        assertThat(disabled.status()).isEqualTo(BookableResourceStatus.DISABLED);
        assertThatThrownBy(
                        () ->
                                service.status(
                                        owner.getId(),
                                        desk.id(),
                                        new Status(BookableResourceStatus.ACTIVE, desk.revision())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void parentRoomMustBeOwnedOnTheSameFloorAndCannotBeAnotherDesk() {
        var room = room();
        var anotherFloor = new FloorPlanModel();
        anotherFloor.setWorkspace(workspace);
        anotherFloor.setName("Other floor");
        anotherFloor.setFloorNumber(2);
        em.persist(anotherFloor);
        em.find(BookableResourceModel.class, room.id()).setFloorPlan(anotherFloor);
        em.flush();
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(),
                                        workspace.getId(),
                                        deskIn(room.id(), "SEAT-01", null)))
                .isInstanceOf(BadRequestException.class);
        var foreign = new WorkspaceModel();
        foreign.setOrganizer(other);
        foreign.setName("Foreign workspace");
        em.persist(foreign);
        anotherFloor.setWorkspace(foreign);
        em.flush();
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(),
                                        workspace.getId(),
                                        deskIn(room.id(), "SEAT-02", null)))
                .isInstanceOf(NotFoundException.class);
        var open = service.create(owner.getId(), workspace.getId(), input("OPEN-01", null));
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(),
                                        workspace.getId(),
                                        deskIn(open.id(), "SEAT-03", null)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void desksMustFitInsideRoomAndCannotPretendToBeOpenAreaOrOverlapOtherDesks() {
        var room = room();
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(),
                                        workspace.getId(),
                                        deskIn(null, "UNLINKED", null)))
                .isInstanceOf(ConflictException.class);
        var outside = input("OUTSIDE", null);
        var withParent =
                new Input(
                        outside.floorPlanId(),
                        outside.resourceTypeId(),
                        outside.code(),
                        outside.name(),
                        outside.zoneName(),
                        outside.noiseLevel(),
                        null,
                        null,
                        null,
                        outside.posX(),
                        outside.posY(),
                        outside.width(),
                        outside.height(),
                        outside.rotation(),
                        null,
                        room.id());
        assertThatThrownBy(() -> service.create(owner.getId(), workspace.getId(), withParent))
                .isInstanceOf(ConflictException.class);
        service.create(owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(),
                                        workspace.getId(),
                                        deskIn(room.id(), "SEAT-02", null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void rotatedRoomContainmentAndDeskCapacityAreChecked() {
        var room = room();
        var model = em.find(BookableResourceModel.class, room.id());
        model.setRotation(new BigDecimal("45"));
        var desk = new BookableResourceModel();
        desk.setLabel("ROTATED");
        desk.setPosX(new BigDecimal("200"));
        desk.setPosY(new BigDecimal("170"));
        desk.setWidth(new BigDecimal("40"));
        desk.setHeight(new BigDecimal("40"));
        base.api.feature.resource.service.ResourceCanvas.fitsInsideRoom(desk, model);
        desk.setPosX(new BigDecimal("100"));
        desk.setPosY(new BigDecimal("100"));
        assertThatThrownBy(
                        () ->
                                base.api.feature.resource.service.ResourceCanvas.fitsInsideRoom(
                                        desk, model))
                .isInstanceOf(ConflictException.class);
        model.setRotation(BigDecimal.ZERO);
        model.setCapacityOverride(1);
        em.flush();
        service.create(owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        assertThatThrownBy(
                        () ->
                                service.create(
                                        owner.getId(),
                                        workspace.getId(),
                                        deskIn(room.id(), "SEAT-02", null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("capacity");
    }

    Input roomPosition(
            base.api.feature.resource.dto.ResourceResponses.Detail room,
            String x,
            String y,
            String angle) {
        return new Input(
                room.floorPlanId(),
                room.resourceTypeId(),
                room.code(),
                room.name(),
                room.zoneName(),
                room.noiseLevel(),
                room.capacityOverride(),
                room.pricePerHour(),
                room.description(),
                new BigDecimal(x),
                new BigDecimal(y),
                room.width(),
                room.height(),
                new BigDecimal(angle),
                room.revision(),
                null);
    }

    @Test
    void movingRoomMovesOnlyItsAssignedDesksAndInvalidatesOldDeskRevisions() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        var open = service.create(owner.getId(), workspace.getId(), input("OPEN-01", null));
        var current = service.detail(owner.getId(), room.id());
        service.update(owner.getId(), room.id(), roomPosition(current, "420", "70", "0"));
        var moved = service.detail(owner.getId(), desk.id());
        assertThat(moved.posX()).isEqualByComparingTo("440");
        assertThat(moved.posY()).isEqualByComparingTo("90");
        assertThat(moved.width()).isEqualByComparingTo("40");
        assertThat(moved.parentRoomId()).isEqualTo(room.id());
        assertThat(service.detail(owner.getId(), open.id()).posX()).isEqualByComparingTo("10");
        assertThat(moved.status()).isEqualTo(desk.status());
        assertThatThrownBy(
                        () ->
                                service.update(
                                        owner.getId(),
                                        desk.id(),
                                        deskIn(room.id(), "SEAT-01", desk.revision())))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("changed");
    }

    @Test
    void rotatingRoomRotatesChildPositionAndAngleWithoutScalingTheDesk() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        service.update(
                owner.getId(),
                room.id(),
                roomPosition(service.detail(owner.getId(), room.id()), "100", "100", "90"));
        var moved = service.detail(owner.getId(), desk.id());
        assertThat(moved.posX()).isEqualByComparingTo("250");
        assertThat(moved.posY()).isEqualByComparingTo("90");
        assertThat(moved.rotation()).isEqualByComparingTo("90");
        assertThat(moved.width()).isEqualByComparingTo("40");
        assertThat(moved.height()).isEqualByComparingTo("40");
    }

    @Test
    void childEditsInvalidateTheRoomFormAndLiveChildBookingsBlockGroupMovement() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        var oldRoom = service.detail(owner.getId(), room.id());
        service.update(
                owner.getId(), desk.id(), deskIn(room.id(), "SEAT-RENAMED", desk.revision()));
        assertThatThrownBy(
                        () ->
                                service.update(
                                        owner.getId(),
                                        room.id(),
                                        roomPosition(oldRoom, "420", "70", "0")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("changed");
        liveBookingFor(desk.id());
        var current = service.detail(owner.getId(), room.id());
        assertThatThrownBy(
                        () ->
                                service.update(
                                        owner.getId(),
                                        room.id(),
                                        roomPosition(current, "420", "70", "0")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("bookings");
        assertThat(service.detail(owner.getId(), desk.id()).posX()).isEqualByComparingTo("120");
    }

    @Test
    void failedGroupMovementRollsBackEveryRowInItsOwnTransaction() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        var blocker =
                service.create(
                        owner.getId(),
                        workspace.getId(),
                        new Input(
                                floor.getId(),
                                type.getId(),
                                "BLOCKER",
                                "Open-area desk",
                                null,
                                null,
                                null,
                                null,
                                null,
                                new BigDecimal("520"),
                                new BigDecimal("120"),
                                new BigDecimal("40"),
                                new BigDecimal("40"),
                                BigDecimal.ZERO,
                                null));
        var current = service.detail(owner.getId(), room.id());
        Long ownerId = owner.getId(), otherId = other.getId(), workspaceId = workspace.getId();
        Long roleId = owner.getRoleEntity().getId();
        org.springframework.test.context.transaction.TestTransaction.flagForCommit();
        org.springframework.test.context.transaction.TestTransaction.end();
        try {
            assertThatThrownBy(
                            () ->
                                    service.update(
                                            ownerId,
                                            room.id(),
                                            roomPosition(current, "500", "100", "0")))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("overlaps");
            org.springframework.test.context.transaction.TestTransaction.start();
            assertThat(service.detail(ownerId, room.id()).posX()).isEqualByComparingTo("100");
            assertThat(service.detail(ownerId, desk.id()).posX()).isEqualByComparingTo("120");
            assertThat(service.detail(ownerId, desk.id()).revision()).isEqualTo(desk.revision());
        } finally {
            if (org.springframework.test.context.transaction.TestTransaction.isActive()) {
                org.springframework.test.context.transaction.TestTransaction.flagForRollback();
                org.springframework.test.context.transaction.TestTransaction.end();
            }
            new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                    .executeWithoutResult(
                            status -> {
                                em.createQuery("delete from BookableResourceModel r where r.id=:id")
                                        .setParameter("id", desk.id())
                                        .executeUpdate();
                                em.createQuery(
                                                "delete from BookableResourceModel r where r.id in"
                                                        + " :ids")
                                        .setParameter(
                                                "ids", java.util.List.of(room.id(), blocker.id()))
                                        .executeUpdate();
                                em.createQuery(
                                                "delete from ResourceTypeModel t where"
                                                        + " t.workspace.id=:id")
                                        .setParameter("id", workspaceId)
                                        .executeUpdate();
                                em.createQuery(
                                                "delete from FloorPlanModel f where"
                                                        + " f.workspace.id=:id")
                                        .setParameter("id", workspaceId)
                                        .executeUpdate();
                                em.createQuery("delete from WorkspaceModel w where w.id=:id")
                                        .setParameter("id", workspaceId)
                                        .executeUpdate();
                                em.createQuery(
                                                "delete from OrganizerProfileModel p where"
                                                        + " p.organizer.id in :ids")
                                        .setParameter("ids", java.util.List.of(ownerId, otherId))
                                        .executeUpdate();
                                em.createQuery("delete from UserModel u where u.id in :ids")
                                        .setParameter("ids", java.util.List.of(ownerId, otherId))
                                        .executeUpdate();
                                em.createQuery("delete from RoleModel r where r.id=:id")
                                        .setParameter("id", roleId)
                                        .executeUpdate();
                            });
        }
        org.springframework.test.context.transaction.TestTransaction.start();
    }

    base.api.feature.resource.dto.FloorDecorations.Item tableDecoration(String name, String x) {
        return new base.api.feature.resource.dto.FloorDecorations.Item(
                "table-01",
                base.api.feature.resource.dto.FloorDecorations.Kind.TABLE,
                name,
                new BigDecimal(x),
                new BigDecimal("100"),
                new BigDecimal("120"),
                new BigDecimal("60"),
                BigDecimal.ZERO,
                "#94a3b8");
    }

    @Test
    void decorationDraftIsPersistentNonBookableAndInvisibleUntilPublish() {
        long before = resources.count();
        var layout = service.floorLayout(owner.getId(), workspace.getId(), floor.getId());
        var draft =
                service.saveDecorations(
                        owner.getId(),
                        workspace.getId(),
                        floor.getId(),
                        new base.api.feature.resource.dto.FloorDecorations.Save(
                                layout.floor().revision(),
                                new BigDecimal("1200"),
                                new BigDecimal("800"),
                                java.util.List.of(tableDecoration("Shared table", "100"))));
        em.clear();
        assertThat(
                        service.floorLayout(owner.getId(), workspace.getId(), floor.getId())
                                .decorations())
                .hasSize(1);
        assertThat(draft.draftChanges()).isTrue();
        assertThat(resources.count()).isEqualTo(before);
        assertThat(publicMaps.maps(workspace.getId()).get(0).decorations()).isEmpty();
        service.publishFloor(
                owner.getId(),
                workspace.getId(),
                floor.getId(),
                new PublishFloor(
                        draft.floor().revision(),
                        draft.width(),
                        draft.height(),
                        true,
                        java.util.List.of()));
        var published = publicMaps.maps(workspace.getId()).get(0);
        assertThat(published.decorations())
                .extracting(item -> item.label())
                .containsExactly("Shared table");
        assertThat(published.resources()).isEmpty();
        var current = service.floorLayout(owner.getId(), workspace.getId(), floor.getId());
        service.saveDecorations(
                owner.getId(),
                workspace.getId(),
                floor.getId(),
                new base.api.feature.resource.dto.FloorDecorations.Save(
                        current.floor().revision(),
                        current.width(),
                        current.height(),
                        java.util.List.of()));
        assertThat(publicMaps.maps(workspace.getId()).get(0).decorations()).hasSize(1);
        assertThat(resources.count()).isEqualTo(before);
    }

    @Test
    void decorationWritesCheckOwnershipRevisionBoundsAndWorkspaceState() {
        var layout = service.floorLayout(owner.getId(), workspace.getId(), floor.getId());
        var input =
                new base.api.feature.resource.dto.FloorDecorations.Save(
                        layout.floor().revision(),
                        new BigDecimal("1200"),
                        new BigDecimal("800"),
                        java.util.List.of(tableDecoration("Table", "100")));
        assertThatThrownBy(
                        () ->
                                service.saveDecorations(
                                        other.getId(), workspace.getId(), floor.getId(), input))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(
                        () ->
                                service.saveDecorations(
                                        owner.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        new base.api.feature.resource.dto.FloorDecorations.Save(
                                                "stale",
                                                input.width(),
                                                input.height(),
                                                input.decorations())))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(
                        () ->
                                service.saveDecorations(
                                        owner.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        new base.api.feature.resource.dto.FloorDecorations.Save(
                                                layout.floor().revision(),
                                                input.width(),
                                                input.height(),
                                                java.util.List.of(
                                                        tableDecoration("Table", "1190")))))
                .isInstanceOf(ConflictException.class);
        workspace.setStatus(WorkspaceStatus.PENDING_REVIEW);
        em.flush();
        assertThatThrownBy(
                        () ->
                                service.saveDecorations(
                                        owner.getId(), workspace.getId(), floor.getId(), input))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> publicMaps.maps(workspace.getId()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void resourceListUsesOwnedDatabaseDataAndPagination() {
        service.create(owner.getId(), workspace.getId(), input("A-07", null));
        var page =
                service.list(
                        owner.getId(),
                        workspace.getId(),
                        null,
                        ResourceCategory.DESK,
                        BookableResourceStatus.DRAFT,
                        "A-07",
                        1,
                        20);
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).floorPlanId()).isEqualTo(floor.getId());
    }

    @Test
    void decorationsRejectOverlapsButAllowContainmentAndTouchingEdges() {
        var room = room();
        service.create(owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        var layout = service.floorLayout(owner.getId(), workspace.getId(), floor.getId());
        assertThatThrownBy(
                        () ->
                                service.saveDecorations(
                                        owner.getId(),
                                        workspace.getId(),
                                        floor.getId(),
                                        new base.api.feature.resource.dto.FloorDecorations.Save(
                                                layout.floor().revision(),
                                                layout.width(),
                                                layout.height(),
                                                java.util.List.of(
                                                        tableDecoration(
                                                                "Overlapping seat", "120")))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("overlaps resource");
        var table = tableDecoration("Table", "180");
        var other =
                new base.api.feature.resource.dto.FloorDecorations.Item(
                        "plant-02",
                        base.api.feature.resource.dto.FloorDecorations.Kind.PLANT,
                        "Plant",
                        new BigDecimal("290"),
                        new BigDecimal("100"),
                        new BigDecimal("40"),
                        new BigDecimal("40"),
                        BigDecimal.ZERO,
                        "#22aa44");
        assertThatThrownBy(
                        () ->
                                ResourceCanvas.validateDecorations(
                                        java.util.List.of(table, other),
                                        new ResourceCanvas.Bounds(layout.width(), layout.height())))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("overlap");
        var touching =
                new base.api.feature.resource.dto.FloorDecorations.Item(
                        other.id(),
                        other.kind(),
                        other.label(),
                        new BigDecimal("300"),
                        other.posY(),
                        other.width(),
                        other.height(),
                        other.rotation(),
                        other.color());
        var saved =
                service.saveDecorations(
                        owner.getId(),
                        workspace.getId(),
                        floor.getId(),
                        new base.api.feature.resource.dto.FloorDecorations.Save(
                                layout.floor().revision(),
                                layout.width(),
                                layout.height(),
                                java.util.List.of(table, touching)));
        assertThat(saved.decorations()).hasSize(2);
    }

    @Test
    void roomMovementCarriesPublishedAndDraftFurnitureWithoutPublishingDraftObjects() {
        var room = room();
        var desk =
                service.create(
                        owner.getId(), workspace.getId(), deskIn(room.id(), "SEAT-01", null));
        var table = tableDecoration("Table", "180");
        floor.setLayoutJson(
                ResourceCanvas.writeDecorations(
                        floor, ResourceCanvas.read(floor), java.util.List.of(table)));
        var plant =
                new base.api.feature.resource.dto.FloorDecorations.Item(
                        "plant-02",
                        base.api.feature.resource.dto.FloorDecorations.Kind.PLANT,
                        "Plant",
                        new BigDecimal("110"),
                        new BigDecimal("220"),
                        new BigDecimal("40"),
                        new BigDecimal("40"),
                        BigDecimal.ZERO,
                        "#22aa44");
        floor.setDraftLayoutJson(
                ResourceCanvas.writeDecorations(
                        floor, ResourceCanvas.read(floor), java.util.List.of(table, plant)));
        em.flush();
        service.update(
                owner.getId(),
                room.id(),
                roomPosition(service.detail(owner.getId(), room.id()), "420", "70", "0"));
        em.flush();
        em.clear();
        var stored = em.find(base.api.shared.entity.resource.FloorPlanModel.class, floor.getId());
        assertThat(ResourceCanvas.decorations(stored, false)).hasSize(1);
        assertThat(ResourceCanvas.decorations(stored, false).get(0).posX())
                .isEqualByComparingTo("500");
        assertThat(ResourceCanvas.decorations(stored, true)).hasSize(2);
        assertThat(ResourceCanvas.decorations(stored, true).get(1).posY())
                .isEqualByComparingTo("190");
        assertThat(service.detail(owner.getId(), desk.id()).posX()).isEqualByComparingTo("440");
        service.update(
                owner.getId(),
                room.id(),
                roomPosition(service.detail(owner.getId(), room.id()), "420", "70", "90"));
        em.flush();
        em.clear();
        stored = em.find(base.api.shared.entity.resource.FloorPlanModel.class, floor.getId());
        assertThat(ResourceCanvas.decorations(stored, false).get(0).rotation())
                .isEqualByComparingTo("90");
        assertThat(ResourceCanvas.decorations(stored, true)).hasSize(2);
    }
}
