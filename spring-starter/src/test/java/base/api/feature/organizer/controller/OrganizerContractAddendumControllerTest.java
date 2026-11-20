package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.service.OrganizerContractAddendumService;
import base.api.shared.config.*;
import base.api.shared.entity.*;
import base.api.shared.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = OrganizerContractAddendumController.class, properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerContractAddendumControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrganizerContractAddendumService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;
    private AuthUser actor(String role) {
        var account = new UserModel(); account.setId(7L); account.setUserName("test-owner"); account.setEmail("owner@example.test");
        account.setRoleEntity(new RoleModel(role, null)); return new AuthUser(account);
    }
    @Test void anonymousWrongRolesAndNonAdminIssuanceAreBlocked() throws Exception {
        mvc.perform(get("/api/organizer/contract/addenda")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/organizer-applications/1/contract/addenda").with(user(actor("ORGANIZER")))
                .contentType("application/json").content("{\"contractId\":1,\"contentHash\":\"" + "a".repeat(64) + "\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/organizer/contract/addenda/otp").with(user(actor("USER"))).contentType("application/json")
                .content("{\"addendumId\":1,\"contentHash\":\"" + "a".repeat(64) + "\"}")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void authenticatedOwnerComesFromSessionAndPdfHasPrivateHeaders() throws Exception {
        when(service.ownerPdf(7L, 3L)).thenReturn("%PDF-test".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        mvc.perform(get("/api/organizer/contract/addenda/3/pdf?userId=999").with(user(actor("ORGANIZER"))))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store, private"))
                .andExpect(content().contentType("application/pdf"));
        verify(service).ownerPdf(7L, 3L); verifyNoMoreInteractions(service);
    }
    @Test void invalidHashAndMissingConsentNeverReachSigning() throws Exception {
        mvc.perform(post("/api/organizer/contract/addenda/sign").with(user(actor("ORGANIZER"))).contentType("application/json")
                .content("{\"addendumId\":1,\"contentHash\":\"invalid\",\"otp\":\"123456\",\"consent\":false}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
