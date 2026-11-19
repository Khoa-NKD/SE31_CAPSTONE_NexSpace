package base.api.feature.operations;

import base.api.feature.operations.dto.OperationsDtos.*;
import base.api.feature.operations.service.OrganizerOperationsService;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.repository.*;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizerOperationsServiceTest {
    @Mock IWorkspaceRepository workspaces;
    @Mock IBookableResourceRepository resources;
    @Mock IResourceTypeRepository types;
    @Mock IPricingRuleRepository rules;
    @Mock IResourceBlockedSlotRepository blocks;
    @Mock IResourceLockService locks;
    @Mock IUserRepository users;
    @Mock IAuditService audit;
    @InjectMocks OrganizerOperationsService service;
    private WorkspaceModel workspace;
    private BookableResourceModel resource;
    private final LocalDateTime start=LocalDateTime.of(2099,1,1,10,0);
    @BeforeEach void setup() {
        workspace=new WorkspaceModel();workspace.setId(18L);var user=new UserModel();user.setId(1L);workspace.setOrganizer(user);
        var floor=new FloorPlanModel();floor.setId(20L);floor.setWorkspace(workspace);floor.setFloorNumber(2);
        resource=new BookableResourceModel();resource.setId(100L);resource.setFloorPlan(floor);resource.setLabel("R1");
    }
    @Test void foreignWorkspaceCannotReadPricingOrBlocks() {
        assertThatThrownBy(()->service.pricing(2L,18L)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(()->service.blocks(2L,18L,start,start.plusHours(1))).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(resources,types,rules,blocks);
    }
    @Test void foreignResourceCannotBeBlocked() {
        when(workspaces.findByIdAndOrganizerId(18L,1L)).thenReturn(Optional.of(workspace));
        var foreign=new WorkspaceModel();foreign.setId(19L);resource.getFloorPlan().setWorkspace(foreign);
        when(resources.findDetailedById(100L)).thenReturn(Optional.of(resource));
        assertThatThrownBy(()->service.createBlocks(1L,18L,input(List.of(100L)))).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(locks,blocks);
    }
    @Test void overlapFailureWritesNothing() {
        ownResource();
        when(locks.acquireResourcesLock(List.of(100L),start,start.plusHours(1),null)).thenThrow(new ConflictException("Already booked"));
        assertThatThrownBy(()->service.createBlocks(1L,18L,input(List.of(100L)))).isInstanceOf(ConflictException.class);
        verifyNoInteractions(blocks,users,audit);
    }
    @Test void blocksUseCheckoutLocksAndDeduplicateTargets() {
        ownResource();when(blocks.save(any())).thenAnswer(invocation->{var row=invocation.getArgument(0,ResourceBlockedSlotModel.class);row.setId(5L);return row;});
        when(users.getReferenceById(1L)).thenReturn(workspace.getOrganizer());
        var result=service.createBlocks(1L,18L,input(List.of(100L,100L)));
        assertThat(result).hasSize(1);assertThat(result.get(0).resourceId()).isEqualTo(100L);
        assertThat(result.get(0).startTime()).isEqualTo(start);
        var order=inOrder(locks,blocks);order.verify(locks).acquireResourcesLock(List.of(100L),start,start.plusHours(1),null);order.verify(blocks).save(any());
    }
    @Test void emptyAndInvertedWindowsAreRejected() {
        when(workspaces.findByIdAndOrganizerId(18L,1L)).thenReturn(Optional.of(workspace));
        assertThatThrownBy(()->service.createBlocks(1L,18L,input(List.of()))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->service.createBlocks(1L,18L,new BlockInput(List.of(100L),start,start,ResourceBlockType.BLOCKED,"maintenance"))).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(locks,blocks);
    }
    @Test void deletionCannotTargetAnotherWorkspace() {
        when(workspaces.findByIdAndOrganizerId(18L,1L)).thenReturn(Optional.of(workspace));
        var foreign=new WorkspaceModel();foreign.setId(99L);resource.getFloorPlan().setWorkspace(foreign);
        var block=new ResourceBlockedSlotModel();block.setResource(resource);when(blocks.findById(2L)).thenReturn(Optional.of(block));
        assertThatThrownBy(()->service.deleteBlock(1L,18L,2L)).isInstanceOf(NotFoundException.class);
        verify(blocks,never()).delete(any());
    }
    @Test void rulesRejectConflictingScopesAndIncompleteWindows() {
        assertThatThrownBy(()->OrganizerOperationsService.validateRule(rule(1L,2L,PricingModifierType.CUSTOM))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->OrganizerOperationsService.validateRule(rule(null,null,PricingModifierType.PEAK_HOUR))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->OrganizerOperationsService.validateRule(rule(null,null,PricingModifierType.HOLIDAY))).isInstanceOf(BadRequestException.class);
        OrganizerOperationsService.validateRule(rule(null,null,PricingModifierType.CUSTOM));
    }
    @Test void fixedWorkspaceSurchargeCannotMixCurrencies() {
        when(workspaces.findOwnedForResourceUpdate(18L,1L)).thenReturn(Optional.of(workspace));
        var vnd=new ResourceTypeModel();vnd.setActive(true);vnd.setCurrency(ResourceCurrency.VND);
        var usd=new ResourceTypeModel();usd.setActive(true);usd.setCurrency(ResourceCurrency.USD);
        when(types.findByWorkspaceId(18L)).thenReturn(List.of(vnd,usd));
        assertThatThrownBy(()->service.saveRule(1L,18L,null,rule(null,null,PricingModifierType.CUSTOM))).isInstanceOf(BadRequestException.class);
        verify(rules,never()).saveAndFlush(any());
    }
    private RuleInput rule(Long type,Long target,PricingModifierType kind) {return new RuleInput("Peak",type,target,kind,null,null,null,null,BigDecimal.ONE,BigDecimal.TEN,0,true);}
    private BlockInput input(List<Long> ids) {return new BlockInput(ids,start,start.plusHours(1),ResourceBlockType.MAINTENANCE,"Network maintenance");}
    private void ownResource(){when(workspaces.findByIdAndOrganizerId(18L,1L)).thenReturn(Optional.of(workspace));when(resources.findDetailedById(100L)).thenReturn(Optional.of(resource));}
}
