package base.api.feature.workspace.service;

import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.workspace.WorkspaceCancellationRuleModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceCancellationPolicyServiceTest {
    @Mock IWorkspaceCancellationRuleRepository rules;
    @Mock IWorkspaceRepository workspaces;
    @InjectMocks WorkspaceCancellationPolicyService service;
    private WorkspaceModel workspace() { var w=new WorkspaceModel();w.setId(18L);return w; }
    @Test void rejectsExplicitEmptyPolicyBeforeAnyWrite() {
        assertThatThrownBy(()->service.save(1L,workspace(),List.of())).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(rules,workspaces);
    }
    @Test void foreignOwnerCannotChangePolicy() {
        when(workspaces.lockOwnedPolicy(18L,2L)).thenReturn(Optional.empty());
        assertThatThrownBy(()->service.save(2L,workspace(),CancellationPolicies.defaults())).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(rules);
    }
    @Test void missingPolicyGetsDefaultsAndReplacementIsSerialized() {
        var w=workspace(); when(workspaces.lockOwnedPolicy(18L,1L)).thenReturn(Optional.of(w));
        service.save(1L,w,null);
        var ordered=inOrder(workspaces,rules);
        ordered.verify(workspaces).lockOwnedPolicy(18L,1L);
        ordered.verify(rules).findByWorkspaceIdOrderByMinHoursBeforeStartDesc(18L);
        ordered.verify(rules).deleteAll(List.of()); ordered.verify(rules).flush();
        @SuppressWarnings("unchecked") var rows=ArgumentCaptor.forClass(List.class);
        ordered.verify(rules).saveAll(rows.capture());
        assertThat(rows.getValue()).hasSize(3);
        assertThat(rows.getValue()).extracting(row -> ((WorkspaceCancellationRuleModel) row).getMinHoursBeforeStart())
                .containsExactly(24, 2, 0);
        assertThat(rows.getValue()).extracting(row -> ((WorkspaceCancellationRuleModel) row).getRefundPercent())
                .containsExactly(new BigDecimal("100"), new BigDecimal("50"), BigDecimal.ZERO);
        assertThat(((WorkspaceCancellationRuleModel)rows.getValue().get(0)).getWorkspace()).isSameAs(w);
    }
    @Test void omittedFieldPreservesAnExistingCustomPolicy() {
        var w=workspace();when(workspaces.lockOwnedPolicy(18L,1L)).thenReturn(Optional.of(w));
        var row=new WorkspaceCancellationRuleModel();row.setMinHoursBeforeStart(48);row.setRefundPercent(new BigDecimal("80"));
        when(rules.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(18L)).thenReturn(List.of(row));
        service.save(1L,w,null);
        verify(rules,never()).deleteAll(any());verify(rules,never()).saveAll(any());
    }
}
