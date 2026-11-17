package base.api.feature.resource;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import base.api.feature.resource.dto.*;
import base.api.feature.resource.service.*;
import base.api.feature.resource.repository.*;
import base.api.shared.entity.*;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;

@DataJpaTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:floor_ai;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.show-sql=false", "spring.sql.init.mode=never", "spring.flyway.enabled=false"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({OrganizerResourceService.class, BuildingService.class, ResourceUsageRepository.class,
        FloorDesignService.class, FloorAiService.class, PublicFloorMapService.class, FloorAiDatabaseTest.Beans.class})
class FloorAiDatabaseTest {
    @TestConfiguration static class Beans {
        @Bean Clock organizerApplicationClock() { return Clock.fixed(Instant.parse("2026-11-11T00:00:00Z"), ZoneOffset.UTC); }
        @Bean ObjectMapper objectMapper() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean GeminiFloorDesigner gemini() { return mock(GeminiFloorDesigner.class); }
        @Bean ResourceTypePhotos resourceTypePhotos() { return mock(ResourceTypePhotos.class); }
        @Bean TransactionTemplate transactionTemplate(PlatformTransactionManager manager) { return new TransactionTemplate(manager); }
    }
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired FloorAiService ai;
    @Autowired FloorDesignService design;
    @Autowired OrganizerResourceService resources;
    @Autowired GeminiFloorDesigner gemini;
    @Autowired PublicFloorMapService publicMaps;
    @Autowired BuildingService buildings;
    Long owner, workspace, floor, type;
    @BeforeEach void seedOnlyInMemory() {
        reset(gemini); when(gemini.status()).thenReturn(new FloorDesign.Status(true, "test-model"));
        tx.execute(s -> {
            String url = em.unwrap(org.hibernate.Session.class).doReturningWork(c -> c.getMetaData().getURL());
            assertThat(url).startsWith("jdbc:h2:mem:");
            var role = em.createQuery("select r from RoleModel r where r.name='ORGANIZER'", RoleModel.class).getResultStream().findFirst().orElse(null);
            if (role == null) { role = new RoleModel("ORGANIZER", null); em.persist(role); }
            var user = new UserModel(); user.setUserName("ai-" + UUID.randomUUID().toString().substring(0,8));
            user.setEmail(user.getUserName()+"@example.test"); user.setPassword("test-only"); user.setRoleEntity(role); user.setVerified(true); em.persist(user);
            var profile = new OrganizerProfileModel(); profile.setOrganizer(user); profile.setStatus(OrganizerProfileStatus.APPROVED); em.persist(profile);
            var w = new WorkspaceModel(); w.setOrganizer(user); w.setName("AI workspace"); w.setStatus(WorkspaceStatus.DRAFT); w.setAreaSqm(new BigDecimal("200")); em.persist(w);
            var b = new BuildingModel(); b.setOrganizer(user); b.setName("Test building"); b.setAddress("Test address"); em.persist(b);
            var p = new BuildingFloorModel(); p.setBuilding(b); p.setName("Physical floor"); p.setFloorNumber(1);
            p.setGeometryVersion(2);
            p.setCanvasWidth(new BigDecimal("1200")); p.setCanvasHeight(new BigDecimal("600")); p.setRealWidthM(new BigDecimal("20")); p.setRealLengthM(new BigDecimal("10")); em.persist(p);
            var f = new FloorPlanModel(); f.setWorkspace(w); f.setBuildingFloor(p); f.setName("Area"); f.setFloorNumber(1);
            f.setUsageX(BigDecimal.ZERO); f.setUsageY(BigDecimal.ZERO); f.setUsageWidth(new BigDecimal("1200")); f.setUsageHeight(new BigDecimal("600"));
            f.setLayoutJson(ResourceCanvas.write(new BigDecimal("1200"),new BigDecimal("600"))); em.persist(f);
            var t = new ResourceTypeModel(); t.setWorkspace(w); t.setName("Desk"); t.setCategory(ResourceCategory.DESK); t.setCurrency(ResourceCurrency.VND); t.setPricePerHour(new BigDecimal("30000")); t.setUsageKind(ResourceUsageKind.WORK_SEAT); t.setStandardWidthM(new BigDecimal("0.60")); t.setStandardLengthM(new BigDecimal("0.50")); em.persist(t);
            em.flush(); owner=user.getId(); workspace=w.getId(); floor=f.getId(); type=t.getId(); return null;
        });
    }
    FloorDesign.Design proposal(boolean conflictingTemplate) {
        return new FloorDesign.Design("One desk", null, List.of(new FloorDesign.ResourceChange("n_desk",null,type,"AI desk",null,1,
                new BigDecimal("100"),new BigDecimal("100"),new BigDecimal("36"),new BigDecimal("30"),BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT)),
                List.of(),List.of(), conflictingTemplate ? List.of(new FloorDesign.TemplateInput("Sofa", FloorDecorations.Kind.OTHER,BigDecimal.ONE,BigDecimal.ONE,"#334455",null)) : List.of());
    }
    FloorDesign.Propose request() {
        return new FloorDesign.Propose("Add one desk",resources.floorLayout(owner,workspace,floor).floor().revision(), FloorDesign.Scope.WORKSPACE,null,"en",null);
    }
    @Test void savesRealDataAndReplaysWithoutDuplicates() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var draft = ai.propose(owner,workspace,floor,request()); assertThat(draft.applicable()).isTrue();
        var result = ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false));
        assertThat(result.resources()).hasSize(1); assertThat(result.resources().get(0).id()).isPositive();
        assertThat(ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false))).isEqualTo(result);
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).hasSize(1);
    }
    @Test void libraryFailureRollsBackResourcesAndProposalCanBeRetried() {
        design.saveTemplate(owner,null,new FloorDesign.TemplateInput("Sofa",FloorDecorations.Kind.OTHER,BigDecimal.ONE,BigDecimal.ONE,"#334455",null));
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(true));
        var draft = ai.propose(owner,workspace,floor,request());
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),true))).isInstanceOf(ConflictException.class);
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
        assertThat(ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false)).resources()).hasSize(1);
    }
    @Test void measuredAreaUsesPhysicalScaleAndOwnerIsChecked() {
        var metric = design.metrics(owner,workspace,floor);
        assertThat(metric.areaSqm()).isEqualByComparingTo("200");
        assertThat(metric.workspaceMappedAreaSqm()).isEqualByComparingTo("200");
        assertThatThrownBy(() -> ai.status(owner+100000,workspace,floor)).isInstanceOf(UnauthorizedException.class);
    }
    @Test void dimensionReviewRejectsShrinkAndKeepsWorkspaceMetresOnExpansion() {
        var before = design.metrics(owner, workspace, floor);
        var shrink = new FloorDesign.MetricsInput(before.revision(), new BigDecimal("19"), new BigDecimal("10"), null, null);
        assertThat(design.previewMetrics(owner, workspace, floor, shrink).applicable()).isFalse();
        assertThatThrownBy(() -> design.saveMetrics(owner, workspace, floor, shrink)).isInstanceOf(ConflictException.class);
        assertThat(design.metrics(owner, workspace, floor).physicalWidthM()).isEqualByComparingTo("20");
        var larger = new FloorDesign.MetricsInput(before.revision(), new BigDecimal("30"), new BigDecimal("10"), null, null);
        var result = design.saveMetrics(owner, workspace, floor, larger);
        assertThat(result.physicalWidthM()).isEqualByComparingTo("30");
        assertThat(result.widthM()).isEqualByComparingTo("20");
        assertThat(result.areaSqm()).isEqualByComparingTo("200");
    }

    @Test void legacyAiClearCanBeSavedPublishedAndRemovedWithoutInventingFloorMeasurements() {
        tx.execute(status -> {
            var area = em.find(FloorPlanModel.class, floor);
            var physical = area.getBuildingFloor(); physical.setGeometryVersion(1);
            physical.setRealWidthM(null); physical.setRealLengthM(null);
            var object = new FloorDecorations.Item("old_table", FloorDecorations.Kind.TABLE, "Table", new BigDecimal("20"),
                    new BigDecimal("20"), new BigDecimal("60"), new BigDecimal("40"), BigDecimal.ZERO, "#334455");
            area.setLayoutJson(ResourceCanvas.writeDecorations(area, new ResourceCanvas.Bounds(new BigDecimal("1200"), new BigDecimal("600")), List.of(object)));
            return null;
        });
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Clear layout", null, List.of(), List.of(), List.of(), List.of()));
        var clear = ai.propose(owner, workspace, floor, request());
        assertThat(clear.applicable()).isTrue();
        var saved = ai.apply(owner, workspace, floor, new FloorDesign.Apply(clear.proposalId(), false));
        assertThat(saved.decorations()).isEmpty();
        assertThatThrownBy(() -> resources.deleteFloor(owner, workspace, floor, saved.floor().revision()))
                .isInstanceOf(ConflictException.class).hasMessageContaining("published layout still contains 1 object");
        publishCurrentFloor();
        var published = resources.floorLayout(owner, workspace, floor);
        assertThat(published.decorations()).isEmpty();
        assertThat(design.metrics(owner, workspace, floor).physicalWidthM()).isNull();
        resources.deleteFloor(owner, workspace, floor, published.floor().revision());
        FloorPlanModel deleted = tx.execute(status -> em.find(FloorPlanModel.class, floor));
        assertThat(deleted).isNull();
    }

    @Test void movingLegacyFurnitureCannotUseTheDeletionOnlyException() {
        var object = new FloorDecorations.Item("table", FloorDecorations.Kind.TABLE, "Table", new BigDecimal("20"),
                new BigDecimal("20"), new BigDecimal("60"), new BigDecimal("40"), BigDecimal.ZERO, "#334455");
        tx.execute(status -> {
            var area = em.find(FloorPlanModel.class, floor); area.getBuildingFloor().setGeometryVersion(1);
            area.setLayoutJson(ResourceCanvas.writeDecorations(area, new ResourceCanvas.Bounds(new BigDecimal("1200"), new BigDecimal("600")), List.of(object)));
            return null;
        });
        var moved = new FloorDecorations.Item(object.id(), object.kind(), object.label(), new BigDecimal("100"),
                object.posY(), object.width(), object.height(), object.rotation(), object.color());
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Move table", null, List.of(), List.of(), List.of(moved), List.of()));
        var proposal = ai.propose(owner, workspace, floor, request());
        assertThat(proposal.applicable()).isTrue();
        assertThatThrownBy(() -> ai.apply(owner, workspace, floor, new FloorDesign.Apply(proposal.proposalId(), false)))
                .isInstanceOf(ConflictException.class).hasMessageContaining("physical floor dimensions");
        assertThat(resources.floorLayout(owner, workspace, floor).decorations()).singleElement()
                .satisfies(retained -> assertThat(retained.posX()).isEqualByComparingTo("20"));
    }

    @Test void legacyAiGeometryChangesStillRequireConfirmedMeasurements() {
        tx.execute(status -> { em.find(FloorPlanModel.class, floor).getBuildingFloor().setGeometryVersion(1); return null; });
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var draft = ai.propose(owner, workspace, floor, request());
        assertThat(draft.applicable()).isTrue();
        assertThatThrownBy(() -> ai.apply(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false)))
                .isInstanceOf(ConflictException.class).hasMessageContaining("physical floor dimensions");
        assertThat(resources.floorLayout(owner, workspace, floor).resources()).isEmpty();
    }

    @Test void legacyUnequalAxesCannotSilentlyStretchWorkspaceAreas() {
        tx.execute(status -> {
            var area = em.find(FloorPlanModel.class, floor);
            var physical = area.getBuildingFloor();
            physical.setGeometryVersion(1); physical.setRealWidthM(new BigDecimal("20")); physical.setRealLengthM(new BigDecimal("40"));
            physical.setCanvasWidth(new BigDecimal("1200")); physical.setCanvasHeight(new BigDecimal("800"));
            return null;
        });
        var before = design.metrics(owner, workspace, floor);
        var request = new FloorDesign.MetricsInput(before.revision(), new BigDecimal("40"), new BigDecimal("40"), null, null, true);
        var review = design.previewMetrics(owner, workspace, floor, request);
        assertThat(review.applicable()).isFalse();
        assertThat(review.issues()).anyMatch(issue -> issue.startsWith("Legacy floor measurements need manual review"));
        assertThatThrownBy(() -> design.saveMetrics(owner, workspace, floor, request)).isInstanceOf(ConflictException.class);
        var after = design.metrics(owner, workspace, floor);
        assertThat(after.physicalWidthM()).isEqualByComparingTo(before.physicalWidthM());
        assertThat(after.physicalLengthM()).isEqualByComparingTo(before.physicalLengthM());
    }

    @Test void staleCalibrationRequestsCannotRemapWorkspaceGeometry() {
        var before = design.metrics(owner, workspace, floor);
        var request = new FloorDesign.MetricsInput(before.revision(), new BigDecimal("40"), new BigDecimal("40"),
                null, null, true, FloorDesign.MeasurementMode.CALIBRATE);
        assertThatThrownBy(() -> design.previewMetrics(owner, workspace, floor, request))
                .isInstanceOf(ConflictException.class).hasMessageContaining("boundary resizing");
        assertThatThrownBy(() -> design.saveMetrics(owner, workspace, floor, request)).isInstanceOf(ConflictException.class);
        assertThat(design.metrics(owner, workspace, floor).widthM()).isEqualByComparingTo(before.widthM());
    }

    @Test void calibrationIsRejectedEvenWithoutConfirmation() {
        var before = design.metrics(owner, workspace, floor);
        var request = new FloorDesign.MetricsInput(before.revision(), new BigDecimal("40"), new BigDecimal("40"),
                null, null, false, FloorDesign.MeasurementMode.CALIBRATE);
        assertThatThrownBy(() -> design.previewMetrics(owner, workspace, floor, request)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> design.saveMetrics(owner, workspace, floor, request)).isInstanceOf(ConflictException.class);
        assertThat(design.metrics(owner, workspace, floor).widthM()).isEqualByComparingTo("20");
    }

    @Test void calibrationCannotMoveResourcesWithLiveBookings() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var draft = ai.propose(owner, workspace, floor, request());
        var saved = ai.apply(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false));
        tx.execute(status -> { em.find(WorkspaceModel.class, workspace).setStatus(WorkspaceStatus.ACTIVE); return null; });
        publishCurrentFloor();
        var seat = resources.status(owner, saved.resources().get(0).id(),
                new ResourceRequests.Status(BookableResourceStatus.ACTIVE, saved.resources().get(0).revision()));
        tx.execute(status -> {
            var booking = new base.api.shared.entity.booking.BookingModel();
            booking.setBookingCode("CAL-" + UUID.randomUUID().toString().substring(0, 16)); booking.setCustomer(em.find(UserModel.class, owner));
            booking.setResource(em.find(BookableResourceModel.class, seat.id())); booking.setWorkspace(em.find(WorkspaceModel.class, workspace));
            booking.setStartTime(LocalDateTime.of(2026, 11, 12, 1, 0)); booking.setEndTime(LocalDateTime.of(2026, 11, 12, 2, 0));
            booking.setPriceType(PriceType.HOURLY); booking.setBaseAmount(BigDecimal.ONE); booking.setFinalPrice(BigDecimal.ONE);
            booking.setStatus(BookingStatus.CONFIRMED); em.persist(booking); return null;
        });
        var before = design.metrics(owner, workspace, floor);
        var request = new FloorDesign.MetricsInput(before.revision(), new BigDecimal("40"), new BigDecimal("40"),
                null, null, true, FloorDesign.MeasurementMode.CALIBRATE);
        assertThatThrownBy(() -> design.previewMetrics(owner, workspace, floor, request)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> design.saveMetrics(owner, workspace, floor, request)).isInstanceOf(ConflictException.class);
        assertThat(resources.detail(owner, seat.id()).posX()).isEqualByComparingTo("100");
    }

    @Test void savedAiDraftSurvivesWithoutCreatingResourcesAndIsReusedAsContext() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var draft = ai.propose(owner, workspace, floor, request());
        var saved = ai.saveDraft(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false));
        assertThat(ai.savedDraft(owner, workspace, floor)).isEqualTo(saved);
        assertThat(resources.floorLayout(owner, workspace, floor).resources()).isEmpty();
        ai.propose(owner, workspace, floor, request());
        verify(gemini).design(argThat(context -> context instanceof Map<?, ?> map && map.containsKey("savedMetricDraft")));
    }

    @Test void publicMapUsesPublishedGeometryUntilExplicitRepublish() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var proposal = ai.propose(owner, workspace, floor, request());
        var saved = ai.apply(owner, workspace, floor, new FloorDesign.Apply(proposal.proposalId(), false));
        var id = saved.resources().get(0).id();
        tx.execute(status -> {
            em.find(WorkspaceModel.class, workspace).setStatus(WorkspaceStatus.ACTIVE);
            em.find(BookableResourceModel.class, id).setStatus(BookableResourceStatus.DISABLED);
            return null;
        });
        publishCurrentFloor();
        assertThat(publicMaps.maps(workspace).get(0).resources().get(0).posX()).isEqualByComparingTo("100");
        var original = resources.detail(owner, id);
        var current = resources.floorLayout(owner, workspace, floor);
        resources.saveBatch(owner, workspace, floor, new ResourceRequests.Batch(current.floor().revision(),
                List.of(moveInput(original, new BigDecimal("300"))), List.of()));
        assertThat(resources.detail(owner, id).posX()).isEqualByComparingTo("300");
        assertThat(publicMaps.maps(workspace).get(0).resources().get(0).posX()).isEqualByComparingTo("100");
        publishCurrentFloor();
        assertThat(publicMaps.maps(workspace).get(0).resources().get(0).posX()).isEqualByComparingTo("300");
    }

    @Test void areaResizePreservesResourceMetresAndRejectsContentClipping() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var draft = ai.propose(owner, workspace, floor, request());
        var saved = ai.apply(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false));
        Long physicalId = tx.execute(status -> em.find(FloorPlanModel.class, floor).getBuildingFloor().getId());
        var resized = buildings.updateAllocation(owner, workspace, floor, new BuildingRequests.Allocation(physicalId,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("900"), new BigDecimal("600"), "Area", saved.floor().revision()));
        var seat = resources.detail(owner, saved.resources().get(0).id());
        assertThat(seat.width()).isEqualByComparingTo("36");
        assertThat(seat.posX()).isEqualByComparingTo("100");
        assertThat(design.metrics(owner, workspace, floor).widthM()).isEqualByComparingTo("15");
        assertThatThrownBy(() -> buildings.updateAllocation(owner, workspace, floor, new BuildingRequests.Allocation(physicalId,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("120"), new BigDecimal("600"), "Area", resized.revision())))
                .isInstanceOf(ConflictException.class);
        assertThat(design.metrics(owner, workspace, floor).widthM()).isEqualByComparingTo("15");
    }

    private void publishCurrentFloor() {
        var current = resources.floorLayout(owner, workspace, floor);
        resources.publishFloor(owner, workspace, floor, new ResourceRequests.PublishFloor(current.floor().revision(),
                current.width(), current.height(), true, current.resources().stream()
                .map(r -> new ResourceRequests.ResourceRevision(r.id(), r.revision())).toList()));
    }
    @Test void missingKeyDoesNotCallProviderOrWriteResources() {
        when(gemini.status()).thenReturn(new FloorDesign.Status(false,"test"));
        assertThatThrownBy(() -> ai.propose(owner,workspace,floor,request())).isInstanceOf(ConflictException.class);
        verify(gemini,never()).design(any()); assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
    }
    @Test void changedFloorRejectsStaleProposal() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false)); var draft = ai.propose(owner,workspace,floor,request());
        resources.renameFloor(owner,workspace,floor,new FloorManagement.Rename("Renamed",request().expectedRevision()));
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false))).isInstanceOf(ConflictException.class);
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
    }
    @Test void editsKeepResourceIdentityAndPricing() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var first = ai.propose(owner,workspace,floor,request());
        var saved = ai.apply(owner,workspace,floor,new FloorDesign.Apply(first.proposalId(),false)).resources().get(0);
        var moved = new FloorDesign.ResourceChange("r_"+saved.id(),saved.id(),type,"Moved desk",null,1,
                new BigDecimal("300"),new BigDecimal("100"),new BigDecimal("36"),new BigDecimal("30"),BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Move",null,List.of(moved),List.of(),List.of(),List.of()));
        var edit = ai.propose(owner,workspace,floor,request()); assertThat(edit.applicable()).isTrue();
        var result = ai.apply(owner,workspace,floor,new FloorDesign.Apply(edit.proposalId(),false));
        assertThat(result.resources()).hasSize(1); assertThat(result.resources().get(0).id()).isEqualTo(saved.id());
        assertThat(resources.detail(owner,saved.id()).effectivePricePerHour()).isEqualByComparingTo("30000");
    }
    @Test void overlappingDraftRemainsEditableButCannotBeSavedUntilAdjusted() {
        var first = proposal(false).resources().get(0);
        var other = new FloorDesign.ResourceChange("n_other",null,type,"Other",null,1,first.posX(),first.posY(),first.width(),first.height(),first.rotation(), ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Overlap",null,List.of(first,other),List.of(),List.of(),List.of()));
        var draft = ai.propose(owner, workspace, floor, request());
        assertThat(draft.design().resources()).containsExactly(first, other);
        verify(gemini).design(any());
        assertThatThrownBy(() -> ai.apply(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("overlapping resources");
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
        var moved = new FloorDesign.ResourceChange(other.key(), null, type, other.name(), null, 1,
                new BigDecimal("300"), other.posY(), other.width(), other.height(), other.rotation(), ResourceUsageKind.WORK_SEAT);
        var adjusted = new FloorDesign.Design("Adjusted", null, List.of(first, moved), List.of(), List.of(), List.of());
        assertThat(ai.apply(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false, adjusted))
                .resources()).hasSize(2);
    }
    @Test void concurrentAppliesOnlyCreateOneResource() throws Exception {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false)); var draft = ai.propose(owner,workspace,floor,request());
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try {
            var a = pool.submit(() -> { start.await(); return ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false)); });
            var b = pool.submit(() -> { start.await(); return ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false)); });
            start.countDown();
            assertThat(a.get(15,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(b.get(15,java.util.concurrent.TimeUnit.SECONDS));
            assertThat(resources.floorLayout(owner,workspace,floor).resources()).hasSize(1);
        } finally { pool.shutdownNow(); }
    }
    @Test void newTypesRequirePricesAndConfirmationThenMapToRealIdsIdempotently() {
        var seat = proposal(false).resources().get(0);
        var newSeat = new FloorDesign.ResourceChange(seat.key(),null,-1L,seat.name(),null,1,seat.posX(),seat.posY(),seat.width(),seat.height(),seat.rotation(), ResourceUsageKind.WORK_SEAT);
        var unpriced = new FloorDesign.NewType(-1L,"Window desk",ResourceCategory.DESK,ResourceCurrency.USD,1,null,null,null, ResourceUsageKind.WORK_SEAT, new BigDecimal("0.60"), new BigDecimal("0.50"));
        var plan = new FloorDesign.Design("New desk type",null,List.of(newSeat),List.of(),List.of(),List.of(),List.of(unpriced));
        when(gemini.design(any(), any(), any(), any())).thenReturn(plan);
        var draft = ai.propose(owner,workspace,floor,request());
        assertThat(draft.applicable()).isTrue();
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,plan,false))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,plan,true))).isInstanceOf(BadRequestException.class);
        assertThat(resources.options(owner,workspace).types()).hasSize(1);
        var priced = new FloorDesign.NewType(-1L,unpriced.name(),unpriced.category(),unpriced.currency(),1,new BigDecimal("2.50"),null,null, ResourceUsageKind.WORK_SEAT, new BigDecimal("0.60"), new BigDecimal("0.50"));
        var confirmed = new FloorDesign.Design(plan.message(),null,plan.resources(),List.of(),List.of(),List.of(),List.of(priced));
        var input = new FloorDesign.Apply(draft.proposalId(),false,confirmed,true);
        var result = ai.apply(owner,workspace,floor,input);
        assertThat(result.resources()).hasSize(1);
        var detail = resources.detail(owner,result.resources().get(0).id());
        assertThat(detail.resourceTypeId()).isPositive().isNotEqualTo(type);
        assertThat(detail.effectivePricePerHour()).isEqualByComparingTo("2.50");
        assertThat(ai.apply(owner,workspace,floor,input)).isEqualTo(result);
        assertThat(resources.options(owner,workspace).types()).hasSize(2);
        var createdType = resources.options(owner,workspace).types().stream().filter(t -> t.id().equals(detail.resourceTypeId())).findFirst().orElseThrow();
        assertThat(createdType.usageKind()).isEqualTo(ResourceUsageKind.WORK_SEAT);
        assertThat(createdType.standardWidthM()).isEqualByComparingTo("0.60");
        assertThat(createdType.standardLengthM()).isEqualByComparingTo("0.50");
    }
    @Test void templateFailureRollsBackNewTypeAndIconSurvivesSuccessfulRetry() {
        var seat = proposal(false).resources().get(0);
        var change = new FloorDesign.ResourceChange(seat.key(),null,-1L,seat.name(),null,1,seat.posX(),seat.posY(),seat.width(),seat.height(),seat.rotation(), ResourceUsageKind.WORK_SEAT);
        var newType = new FloorDesign.NewType(-1L,"Quiet desk",ResourceCategory.DESK,ResourceCurrency.VND,1,new BigDecimal("50000"),null,null, ResourceUsageKind.WORK_SEAT, new BigDecimal("0.60"), new BigDecimal("0.50"));
        var template = new FloorDesign.TemplateInput("Locker",FloorDecorations.Kind.OTHER,BigDecimal.ONE,BigDecimal.ONE,"#334455",null,FloorDecorations.Icon.LOCKER);
        design.saveTemplate(owner,null,template);
        var object = new FloorDecorations.Item("locker",FloorDecorations.Kind.OTHER,"Locker",new BigDecimal("600"),new BigDecimal("500"),new BigDecimal("50"),new BigDecimal("50"),BigDecimal.ZERO,"#334455",FloorDecorations.Icon.LOCKER);
        var plan = new FloorDesign.Design("New type and locker",null,List.of(change),List.of(),List.of(object),List.of(template),List.of(newType));
        when(gemini.design(any(), any(), any(), any())).thenReturn(plan);
        var draft = ai.propose(owner,workspace,floor,request());
        assertThat(draft.applicable()).isTrue();
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),true,plan,true))).isInstanceOf(ConflictException.class);
        assertThat(resources.options(owner,workspace).types()).hasSize(1);
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
        var saved = ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,plan,true));
        assertThat(saved.decorations().get(0).icon()).isEqualTo(FloorDecorations.Icon.LOCKER);
        assertThat(design.library(owner).get(0).icon()).isEqualTo(FloorDecorations.Icon.LOCKER);
    }
    @Test void manualBatchSwapsSavedSeatsAgainstTheFinalSceneAndRollsBackInvalidScene() {
        var first = proposal(false).resources().get(0);
        var second = new FloorDesign.ResourceChange("n_second",null,type,"Second",null,1,new BigDecimal("300"),first.posY(),first.width(),first.height(),first.rotation(), ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Two seats",null,List.of(first,second),List.of(),List.of(),List.of()));
        var draft = ai.propose(owner,workspace,floor,request());
        var saved = ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false));
        var a = resources.detail(owner,saved.resources().get(0).id());
        var b = resources.detail(owner,saved.resources().get(1).id());
        var result = resources.saveBatch(owner,workspace,floor,new ResourceRequests.Batch(saved.floor().revision(),
            List.of(moveInput(a,b.posX()),moveInput(b,a.posX())),List.of()));
        assertThat(result).hasSize(2);
        assertThat(resources.detail(owner,a.id()).posX()).isEqualByComparingTo(b.posX());
        var current = resources.floorLayout(owner,workspace,floor);
        var updatedA = resources.detail(owner,a.id());
        var updatedB = resources.detail(owner,b.id());
        assertThatThrownBy(() -> resources.saveBatch(owner,workspace,floor,new ResourceRequests.Batch(current.floor().revision(),
            List.of(moveInput(updatedA,new BigDecimal("500")),moveInput(updatedB,new BigDecimal("500"))),List.of())))
            .isInstanceOf(ConflictException.class);
        assertThat(resources.detail(owner,a.id()).posX()).isEqualByComparingTo(b.posX());
        assertThat(resources.detail(owner,b.id()).posX()).isEqualByComparingTo(a.posX());
    }
    private ResourceRequests.BatchItem moveInput(ResourceResponses.Detail r, BigDecimal x) {
        return new ResourceRequests.BatchItem("r_"+r.id(),r.id(),null,new ResourceRequests.Input(r.floorPlanId(),r.resourceTypeId(),r.code(),r.name(),r.zoneName(),r.noiseLevel(),r.capacityOverride(),r.pricePerHour(),r.description(),x,r.posY(),r.width(),r.height(),r.rotation(),r.revision(),r.parentRoomId()));
    }
    @Test void manuallyAdjustedPreviewIsValidatedAndSavedInsteadOfOriginalProposal() {
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false)); var draft = ai.propose(owner,workspace,floor,request());
        var change = draft.design().resources().get(0);
        var adjusted = new FloorDesign.ResourceChange(change.key(),null,type,change.name(),null,1,
                new BigDecimal("400"),change.posY(),change.width(),change.height(),change.rotation(), ResourceUsageKind.WORK_SEAT);
        var edited = new FloorDesign.Design("Manually adjusted",null,List.of(adjusted),List.of(),List.of(),List.of());
        var result = ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,edited));
        assertThat(result.resources().get(0).posX()).isEqualByComparingTo("400");
        assertThat(ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,edited))).isEqualTo(result);
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false))).isInstanceOf(ConflictException.class);
    }

    @Test void newSeatsInheritMatchingFootprintsAndOfferATypeForDifferentUsage() {
        var original = proposal(false).resources().get(0);
        var wider = new FloorDesign.ResourceChange(original.key(), null, type, original.name(), null, 1,
                original.posX(), original.posY(), new BigDecimal("40"), original.height(), original.rotation(), ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Wider seat", null, List.of(wider), List.of(), List.of(), List.of()));
        var normalized = ai.propose(owner,workspace,floor,request());
        assertThat(normalized.applicable()).isTrue();
        assertThat(normalized.design().resources().get(0).width()).isEqualByComparingTo(original.width());
        var sofa = new FloorDesign.ResourceChange(original.key(), null, type, "Sofa seat", null, 1,
                original.posX(), original.posY(), original.width(), original.height(), original.rotation(), ResourceUsageKind.SOFA_SEAT);
        when(gemini.design(any(), any(), any(), any())).thenReturn(new FloorDesign.Design("Sofa", null, List.of(sofa), List.of(), List.of(), List.of()));
        var sofaDraft = ai.propose(owner,workspace,floor,request());
        assertThat(sofaDraft.issues()).isEmpty();
        assertThat(sofaDraft.applicable()).isTrue();
        assertThat(sofaDraft.design().newTypes()).singleElement().satisfies(proposed -> {
            assertThat(proposed.usageKind()).isEqualTo(ResourceUsageKind.SOFA_SEAT);
            assertThat(proposed.pricePerHour()).isNull();
            assertThat(sofaDraft.design().resources().get(0).resourceTypeId()).isEqualTo(proposed.tempId());
        });
        tx.execute(status -> { var legacy = em.find(ResourceTypeModel.class,type); legacy.setUsageKind(null); legacy.setStandardWidthM(null); legacy.setStandardLengthM(null); return null; });
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        assertThat(ai.propose(owner,workspace,floor,request()).applicable()).isFalse();
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
    }

    @Test void emptyCatalogOffersAnUnpricedDraftEvenIfProviderReturnsAnUnknownTypeId() {
        tx.execute(status -> { em.remove(em.find(ResourceTypeModel.class, type)); return null; });
        when(gemini.design(any(), any(), any(), any())).thenReturn(proposal(false));
        var draft = ai.propose(owner, workspace, floor, request());

        assertThat(draft.issues()).isEmpty();
        assertThat(draft.applicable()).isTrue();
        assertThat(draft.design().newTypes()).singleElement().satisfies(proposed -> {
            assertThat(proposed.tempId()).isNegative();
            assertThat(proposed.pricePerHour()).isNull();
            assertThat(proposed.standardWidthM()).isEqualByComparingTo("0.60");
            assertThat(draft.design().resources().get(0).resourceTypeId()).isEqualTo(proposed.tempId());
        });
        assertThat(resources.options(owner, workspace).types()).isEmpty();
        assertThat(resources.floorLayout(owner, workspace, floor).resources()).isEmpty();
    }

    @Test void roomOnlyCatalogOffersOneNewDeskTypeAndUsesItsDimensionsForAllNewDesks() {
        tx.execute(status -> {
            var roomType = em.find(ResourceTypeModel.class, type);
            roomType.setName("VIP Room");
            roomType.setCategory(ResourceCategory.ROOM);
            roomType.setUsageKind(ResourceUsageKind.PRIVATE_OFFICE);
            roomType.setStandardWidthM(new BigDecimal("5"));
            roomType.setStandardLengthM(new BigDecimal("4"));
            roomType.setCapacity(4);
            return null;
        });
        var first = new FloorDesign.ResourceChange("n_first", null, type, "Desk 1", null, 1,
                new BigDecimal("100"), new BigDecimal("100"), new BigDecimal("30"), new BigDecimal("60"),
                BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT);
        var second = new FloorDesign.ResourceChange("n_second", null, type, "Desk 2", null, 1,
                new BigDecimal("200"), new BigDecimal("100"), first.width(), first.height(),
                BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT);
        var wrongReference = new FloorDesign.Design("Two desks", null, List.of(first, second), List.of(),
                List.of(), List.of());
        when(gemini.design(any(), any(), any(), any())).thenReturn(wrongReference);

        var draft = ai.propose(owner, workspace, floor, request());
        assertThat(draft.issues()).isEmpty();
        assertThat(draft.applicable()).isTrue();
        assertThat(draft.design().newTypes()).hasSize(1);
        var proposed = draft.design().newTypes().get(0);
        assertThat(proposed.category()).isEqualTo(ResourceCategory.DESK);
        assertThat(proposed.pricePerHour()).isNull();
        assertThat(draft.design().resources()).extracting(FloorDesign.ResourceChange::resourceTypeId)
                .containsExactly(proposed.tempId(), proposed.tempId());
        assertThat(resources.options(owner, workspace).types()).hasSize(1);

        var priced = new FloorDesign.NewType(proposed.tempId(), proposed.name(), proposed.category(),
                proposed.currency(), proposed.capacity(), new BigDecimal("30000"), null, null,
                proposed.usageKind(), proposed.standardWidthM(), proposed.standardLengthM());
        var confirmed = new FloorDesign.Design("Two desks", null, draft.design().resources(), List.of(),
                List.of(), List.of(), List.of(priced));
        var saved = ai.apply(owner, workspace, floor, new FloorDesign.Apply(draft.proposalId(), false, confirmed, true));
        assertThat(saved.resources()).hasSize(2).allSatisfy(seat -> {
            assertThat(seat.resourceTypeId()).isPositive().isNotEqualTo(type);
            assertThat(seat.height()).isEqualByComparingTo("60");
        });
        assertThat(resources.options(owner, workspace).types()).hasSize(2);
    }

}
