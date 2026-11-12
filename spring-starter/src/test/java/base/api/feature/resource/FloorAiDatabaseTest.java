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
        FloorDesignService.class, FloorAiService.class, FloorAiDatabaseTest.Beans.class})
class FloorAiDatabaseTest {
    @TestConfiguration static class Beans {
        @Bean Clock organizerApplicationClock() { return Clock.fixed(Instant.parse("2026-11-11T00:00:00Z"), ZoneOffset.UTC); }
        @Bean ObjectMapper objectMapper() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean GeminiFloorDesigner gemini() { return mock(GeminiFloorDesigner.class); }
        @Bean TransactionTemplate transactionTemplate(PlatformTransactionManager manager) { return new TransactionTemplate(manager); }
    }
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired FloorAiService ai;
    @Autowired FloorDesignService design;
    @Autowired OrganizerResourceService resources;
    @Autowired GeminiFloorDesigner gemini;
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
            p.setCanvasWidth(new BigDecimal("1000")); p.setCanvasHeight(new BigDecimal("1000")); p.setRealWidthM(new BigDecimal("20")); p.setRealLengthM(new BigDecimal("10")); em.persist(p);
            var f = new FloorPlanModel(); f.setWorkspace(w); f.setBuildingFloor(p); f.setName("Area"); f.setFloorNumber(1);
            f.setUsageX(BigDecimal.ZERO); f.setUsageY(BigDecimal.ZERO); f.setUsageWidth(new BigDecimal("1000")); f.setUsageHeight(new BigDecimal("1000"));
            f.setLayoutJson(ResourceCanvas.write(new BigDecimal("1000"),new BigDecimal("1000"))); em.persist(f);
            var t = new ResourceTypeModel(); t.setWorkspace(w); t.setName("Desk"); t.setCategory(ResourceCategory.DESK); t.setCurrency(ResourceCurrency.VND); t.setPricePerHour(new BigDecimal("30000")); t.setUsageKind(ResourceUsageKind.WORK_SEAT); t.setStandardWidthM(new BigDecimal("0.60")); t.setStandardLengthM(new BigDecimal("0.50")); em.persist(t);
            em.flush(); owner=user.getId(); workspace=w.getId(); floor=f.getId(); type=t.getId(); return null;
        });
    }
    FloorDesign.Design proposal(boolean conflictingTemplate) {
        return new FloorDesign.Design("One desk", null, List.of(new FloorDesign.ResourceChange("n_desk",null,type,"AI desk",null,1,
                new BigDecimal("100"),new BigDecimal("100"),new BigDecimal("30"),new BigDecimal("50"),BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT)),
                List.of(),List.of(), conflictingTemplate ? List.of(new FloorDesign.TemplateInput("Sofa", FloorDecorations.Kind.OTHER,BigDecimal.ONE,BigDecimal.ONE,"#334455",null)) : List.of());
    }
    FloorDesign.Propose request() {
        return new FloorDesign.Propose("Add one desk",resources.floorLayout(owner,workspace,floor).floor().revision(), FloorDesign.Scope.WORKSPACE,null,"en",null);
    }
    @Test void savesRealDataAndReplaysWithoutDuplicates() {
        when(gemini.design(any())).thenReturn(proposal(false));
        var draft = ai.propose(owner,workspace,floor,request()); assertThat(draft.applicable()).isTrue();
        var result = ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false));
        assertThat(result.resources()).hasSize(1); assertThat(result.resources().get(0).id()).isPositive();
        assertThat(ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false))).isEqualTo(result);
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).hasSize(1);
    }
    @Test void libraryFailureRollsBackResourcesAndProposalCanBeRetried() {
        design.saveTemplate(owner,null,new FloorDesign.TemplateInput("Sofa",FloorDecorations.Kind.OTHER,BigDecimal.ONE,BigDecimal.ONE,"#334455",null));
        when(gemini.design(any())).thenReturn(proposal(true));
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
    @Test void missingKeyDoesNotCallProviderOrWriteResources() {
        when(gemini.status()).thenReturn(new FloorDesign.Status(false,"test"));
        assertThatThrownBy(() -> ai.propose(owner,workspace,floor,request())).isInstanceOf(ConflictException.class);
        verify(gemini,never()).design(any()); assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
    }
    @Test void changedFloorRejectsStaleProposal() {
        when(gemini.design(any())).thenReturn(proposal(false)); var draft = ai.propose(owner,workspace,floor,request());
        resources.renameFloor(owner,workspace,floor,new FloorManagement.Rename("Renamed",request().expectedRevision()));
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false))).isInstanceOf(ConflictException.class);
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
    }
    @Test void editsKeepResourceIdentityAndPricing() {
        when(gemini.design(any())).thenReturn(proposal(false));
        var first = ai.propose(owner,workspace,floor,request());
        var saved = ai.apply(owner,workspace,floor,new FloorDesign.Apply(first.proposalId(),false)).resources().get(0);
        var moved = new FloorDesign.ResourceChange("r_"+saved.id(),saved.id(),type,"Moved desk",null,1,
                new BigDecimal("300"),new BigDecimal("100"),new BigDecimal("30"),new BigDecimal("50"),BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any())).thenReturn(new FloorDesign.Design("Move",null,List.of(moved),List.of(),List.of(),List.of()));
        var edit = ai.propose(owner,workspace,floor,request()); assertThat(edit.applicable()).isTrue();
        var result = ai.apply(owner,workspace,floor,new FloorDesign.Apply(edit.proposalId(),false));
        assertThat(result.resources()).hasSize(1); assertThat(result.resources().get(0).id()).isEqualTo(saved.id());
        assertThat(resources.detail(owner,saved.id()).effectivePricePerHour()).isEqualByComparingTo("30000");
    }
    @Test void overlappingDraftRemainsEditableButCannotBeSavedUntilAdjusted() {
        var first = proposal(false).resources().get(0);
        var other = new FloorDesign.ResourceChange("n_other",null,type,"Other",null,1,first.posX(),first.posY(),first.width(),first.height(),first.rotation(), ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any())).thenReturn(new FloorDesign.Design("Overlap",null,List.of(first,other),List.of(),List.of(),List.of()));
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
        when(gemini.design(any())).thenReturn(proposal(false)); var draft = ai.propose(owner,workspace,floor,request());
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
        when(gemini.design(any())).thenReturn(plan);
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
        var object = new FloorDecorations.Item("locker",FloorDecorations.Kind.OTHER,"Locker",new BigDecimal("600"),new BigDecimal("600"),new BigDecimal("50"),new BigDecimal("50"),BigDecimal.ZERO,"#334455",FloorDecorations.Icon.LOCKER);
        var plan = new FloorDesign.Design("New type and locker",null,List.of(change),List.of(),List.of(object),List.of(template),List.of(newType));
        when(gemini.design(any())).thenReturn(plan);
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
        when(gemini.design(any())).thenReturn(new FloorDesign.Design("Two seats",null,List.of(first,second),List.of(),List.of(),List.of()));
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
        when(gemini.design(any())).thenReturn(proposal(false)); var draft = ai.propose(owner,workspace,floor,request());
        var change = draft.design().resources().get(0);
        var adjusted = new FloorDesign.ResourceChange(change.key(),null,type,change.name(),null,1,
                new BigDecimal("400"),change.posY(),change.width(),change.height(),change.rotation(), ResourceUsageKind.WORK_SEAT);
        var edited = new FloorDesign.Design("Manually adjusted",null,List.of(adjusted),List.of(),List.of(),List.of());
        var result = ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,edited));
        assertThat(result.resources().get(0).posX()).isEqualByComparingTo("400");
        assertThat(ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false,edited))).isEqualTo(result);
        assertThatThrownBy(() -> ai.apply(owner,workspace,floor,new FloorDesign.Apply(draft.proposalId(),false))).isInstanceOf(ConflictException.class);
    }

    @Test void newSeatsCannotReuseTypesWithDifferentFootprintsOrUsageOrUnknownMetadata() {
        var original = proposal(false).resources().get(0);
        var wider = new FloorDesign.ResourceChange(original.key(), null, type, original.name(), null, 1,
                original.posX(), original.posY(), new BigDecimal("40"), original.height(), original.rotation(), ResourceUsageKind.WORK_SEAT);
        when(gemini.design(any())).thenReturn(new FloorDesign.Design("Wider seat", null, List.of(wider), List.of(), List.of(), List.of()));
        var mismatched = ai.propose(owner,workspace,floor,request());
        assertThat(mismatched.applicable()).isFalse();
        assertThat(mismatched.issues()).anyMatch(message -> message.contains("footprint"));
        var sofa = new FloorDesign.ResourceChange(original.key(), null, type, "Sofa seat", null, 1,
                original.posX(), original.posY(), original.width(), original.height(), original.rotation(), ResourceUsageKind.SOFA_SEAT);
        when(gemini.design(any())).thenReturn(new FloorDesign.Design("Sofa", null, List.of(sofa), List.of(), List.of(), List.of()));
        assertThat(ai.propose(owner,workspace,floor,request()).applicable()).isFalse();
        tx.execute(status -> { var legacy = em.find(ResourceTypeModel.class,type); legacy.setUsageKind(null); legacy.setStandardWidthM(null); legacy.setStandardLengthM(null); return null; });
        when(gemini.design(any())).thenReturn(proposal(false));
        assertThat(ai.propose(owner,workspace,floor,request()).applicable()).isFalse();
        assertThat(resources.floorLayout(owner,workspace,floor).resources()).isEmpty();
    }

}
