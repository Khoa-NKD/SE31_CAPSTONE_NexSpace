package base.api.feature.resource;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.resource.controller.OrganizerResourceController;
import base.api.feature.resource.service.OrganizerResourceService;
import base.api.shared.config.*;
import base.api.shared.entity.*;
import base.api.shared.security.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
        value = {
            OrganizerResourceController.class,
            base.api.feature.resource.controller.OrganizerBuildingController.class,
            base.api.feature.resource.controller.PublicFloorMapController.class
        },
        properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerResourceControllerTest {
    // Standalone controller/filter tests may run on the same thread before this slice.
    @BeforeEach
    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Autowired MockMvc mvc;
    @MockitoBean OrganizerResourceService service;
    @MockitoBean base.api.feature.resource.service.BuildingService buildings;
    @MockitoBean base.api.feature.resource.service.PublicFloorMapService publicMaps;
    @MockitoBean JwtUtil jwt;
    @MockitoBean CustomUserDetailsService accounts;
    @MockitoBean ITokenRevocationService revocations;

    private AuthUser actor(String role) {
        var user = new UserModel();
        user.setId(7L);
        user.setUserName("test");
        user.setRoleEntity(new RoleModel(role, null));
        return new AuthUser(user);
    }

    @Test
    void layoutObjectsRejectBookingFieldsAndPublicMapAllowsReadOnlyAnonymousAccess()
            throws Exception {
        mvc.perform(
                        put("/api/organizer/workspaces/1/resource-floors/2/decorations")
                                .with(user(actor("ORGANIZER")))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"expectedRevision\":\"initial\",\"width\":1200,\"height\":800,\"decorations\":[{\"id\":\"table-1\",\"kind\":\"TABLE\",\"label\":\"Table\",\"posX\":10,\"posY\":10,\"width\":100,\"height\":60,\"rotation\":0,\"color\":\"#94a3b8\",\"price\":20}]}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
        when(publicMaps.maps(1L)).thenReturn(java.util.List.of());
        mvc.perform(get("/api/public/workspaces/1/floor-maps")).andExpect(status().isOk());
        verify(publicMaps).maps(1L);
        mvc.perform(get("/api/public/workspaces/0/floor-maps")).andExpect(status().isBadRequest());
        verifyNoMoreInteractions(publicMaps);
    }

    @Test
    void requiresOrganizerForReadsAndWrites() throws Exception {
        mvc.perform(get("/api/organizer/resource-workspaces")).andExpect(status().isUnauthorized());
        for (String role : new String[] {"USER", "ADMIN"}) {
            mvc.perform(get("/api/organizer/resource-workspaces").with(user(actor(role))))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            delete("/api/organizer/resources/1")
                                    .param("expectedRevision", "initial")
                                    .with(user(actor(role))))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(service);
    }

    @Test
    void buildingCatalogRequiresOrganizerAndAllocationRejectsOwnershipFields() throws Exception {
        mvc.perform(get("/api/organizer/buildings")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/organizer/buildings").with(user(actor("USER")))).andExpect(status().isForbidden());
        mvc.perform(get("/api/organizer/buildings").with(user(actor("ADMIN")))).andExpect(status().isForbidden());
        when(buildings.catalog(7L)).thenReturn(java.util.List.of());
        mvc.perform(get("/api/organizer/buildings").with(user(actor("ORGANIZER")))).andExpect(status().isOk());
        verify(buildings).catalog(7L);
        mvc.perform(post("/api/organizer/workspaces/1/floor-allocations").with(user(actor("ORGANIZER")))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"buildingFloorId\":1,\"x\":0,\"y\":0,\"width\":600,\"height\":800,\"name\":\"Area\",\"organizerId\":9}"))
            .andExpect(status().isBadRequest());
        verifyNoMoreInteractions(buildings);
    }

    @Test
    void takesActorFromSessionAndRejectsInvalidParameters() throws Exception {
        when(service.workspaces(7L)).thenReturn(java.util.List.of());
        mvc.perform(get("/api/organizer/resource-workspaces").with(user(actor("ORGANIZER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200));
        verify(service).workspaces(7L);
        mvc.perform(
                        get("/api/organizer/workspaces/1/resources")
                                .param("page", "0")
                                .with(user(actor("ORGANIZER"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMassAssignmentInvalidPricesAndNullIdentifiers() throws Exception {
        for (String body :
                new String[] {
                    "{\"organizerId\":9}",
                    "{\"floorPlanId\":1,\"resourceTypeId\":1,\"code\":\"A-01\",\"name\":\"Desk\",\"pricePerHour\":\"1.234\"}",
                    "{}"
                })
            mvc.perform(
                            post("/api/organizer/workspaces/1/resources")
                                    .with(user(actor("ORGANIZER")))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
