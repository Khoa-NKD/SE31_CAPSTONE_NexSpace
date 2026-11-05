package base.api.feature.organizer.controller;

import base.api.feature.organizer.service.*;
import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.shared.config.*;
import base.api.shared.entity.*;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value=OrganizerDocumentContentController.class, properties="spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerDocumentContentControllerTest {
    static final String URL="/api/organizer/documents/9/content";
    @Autowired MockMvc mvc;
    @MockitoBean AdminOrganizerDocumentContentService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;
    AuthUser principal(String role) {
        var account=new UserModel(); account.setId(1L); account.setUserName("fixture.admin"); account.setRoleEntity(new RoleModel(role, null));
        return new AuthUser(account);
    }
    @Test void onlyOwnerRolesCanReadBinaryAndHeadersPreventCachingOrSniffing() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        for(String role:List.of("ADMIN")) mvc.perform(get(URL).with(user(principal(role)))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
        byte[] bytes="%PDF-1.4".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        when(service.readOwner(1L,9L)).thenReturn(new AdminOrganizerDocumentContentService.Content(bytes,"application/pdf","giấy phép.pdf"));
        when(jwtUtil.extractUserId("fixture-admin-token")).thenReturn(1L);
        when(userDetails.loadUserById(1L)).thenReturn(principal("USER"));
        mvc.perform(get(URL).header("Authorization","Bearer fixture-admin-token"))
                .andExpect(status().isOk()).andExpect(content().bytes(bytes)).andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition",containsString("inline;")))
                .andExpect(header().string("Content-Disposition",containsString("filename*=")))
                .andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("X-Content-Type-Options","nosniff"))
                .andExpect(header().string("Content-Security-Policy",containsString("sandbox")));
        mvc.perform(get(URL).param("download","true").with(user(principal("USER"))))
                .andExpect(status().isOk()).andExpect(header().string("Content-Disposition",containsString("attachment;")));
    }
    @ParameterizedTest @ValueSource(strings={"abc","9223372036854775808","1.5"})
    void rejectsInvalidDocumentIds(String id) throws Exception {
        mvc.perform(get(URL.replace("/9/","/"+id+"/")).with(user(principal("USER")))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void retainsJsonErrorsAndSupportsNoWrites() throws Exception {
        when(service.readOwner(1L,9L)).thenThrow(new NotFoundException("Verification document file not found"));
        mvc.perform(get(URL).with(user(principal("USER")))).andExpect(status().isNotFound()).andExpect(jsonPath("$.statusCode").value(404));
        doThrow(new PrivateDocumentUnavailableException()).when(service).readOwner(1L,9L);
        mvc.perform(get(URL).with(user(principal("USER")))).andExpect(status().isBadGateway()).andExpect(jsonPath("$.statusCode").value(502));
        mvc.perform(post(URL).with(user(principal("USER")))).andExpect(status().isMethodNotAllowed());
    }
}
