package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.response.OrganizerLifecycleContext;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.organizer.service.OrganizerApplicationLifecycleService;
import base.api.feature.workspace.controller.WorkspaceController;
import base.api.feature.workspace.controller.WorkspaceMediaController;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.feature.workspace.service.IWorkspaceMediaService;
import base.api.shared.config.*;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value={WorkspaceController.class,WorkspaceMediaController.class,OrganizerApplicationLifecycleController.class},properties="spring.profiles.active=test")
@Import({SecurityConfig.class,JwtAuthenticationFilter.class,CurrentUserProvider.class})
class OrganizerOperationalAccessTest {
    @Autowired MockMvc mvc;
    @MockitoBean IOrganizerProfileRepository profiles;
    @MockitoBean IWorkspaceService workspaces;
    @MockitoBean IWorkspaceMediaService media;
    @MockitoBean OrganizerApplicationLifecycleService lifecycle;
    @MockitoBean JwtUtil jwt;
    @MockitoBean CustomUserDetailsService users;
    @MockitoBean ITokenRevocationService revocations;
    AuthUser principal(String role) {
        var account=new UserModel();account.setId(7L);account.setUserName("actor");account.setRoleEntity(new RoleModel(role,null));
        return new AuthUser(account);
    }
    @Test void retiredSuspensionFlagDoesNotOverrideNormalOrganizerAuthorization() throws Exception {
        when(profiles.existsByOrganizerIdAndSuspendedTrue(7L)).thenReturn(true);
        when(workspaces.getMyWorkspaces(eq(7L),any(),any())).thenReturn(org.springframework.data.domain.Page.empty());
        for(String path:List.of("/api/workspaces/mine","/api/v1/workspaces/mine"))
            mvc.perform(get(path).with(user(principal("ORGANIZER")))).andExpect(status().isOk());
        verifyNoInteractions(profiles);
    }
    @Test void suspendedAccountRetainsApplicationStatusAccess() throws Exception {
        when(lifecycle.ownerContext(7L)).thenReturn(new OrganizerLifecycleContext(42L,OrganizerProfileStatus.APPROVED,12L,true,"Policy violation",false,false,false,false,List.of(9L)));
        mvc.perform(get("/api/organizer/applications/current/lifecycle").with(user(principal("ORGANIZER"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.suspended").value(true));
        verifyNoInteractions(profiles,workspaces,media);
    }
    @Test void customerFacingPublicMediaRemainsAvailableForSuspendedOrganizerAndAnonymousVisitor() throws Exception {
        when(media.getWorkspaceMedia(anyLong(),nullable(Long.class))).thenReturn(List.of());
        mvc.perform(get("/api/workspaces/1/media").with(user(principal("ORGANIZER")))).andExpect(status().isOk());
        mvc.perform(get("/api/workspaces/1/media")).andExpect(status().isOk());
        verifyNoInteractions(profiles);
    }
}
