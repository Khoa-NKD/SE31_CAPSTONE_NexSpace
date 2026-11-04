package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.dto.response.OrganizerApplicationResponse;
import base.api.feature.organizer.service.OrganizerApplicationService;
import base.api.shared.config.JwtAuthenticationFilter;
import base.api.shared.config.JwtUtil;
import base.api.shared.config.SecurityConfig;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = OrganizerApplicationController.class, properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerApplicationControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrganizerApplicationService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;
    static final String DETAILS = """
            {"legalName":"Company","businessType":"LIMITED_LIABILITY","taxId":"TAX-123",
             "representativeName":"Representative","address":"Business address",
             "contactPhone":"+84901234567","contactEmail":"contact@example.com","userId":999}
            """;

    MockMultipartFile details(String json) {
        return new MockMultipartFile("application", "", "application/json", json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    MockMultipartFile license() {
        return new MockMultipartFile("businessLicense", "license.pdf", "application/pdf", "%PDF-1.4".getBytes());
    }

    AuthUser principal(String role) {
        var account = new UserModel();
        account.setId(7L);
        account.setUserName("applicant");
        account.setPassword("unused");
        account.setRoleEntity(new RoleModel(role, null));
        return new AuthUser(account);
    }

    @Test
    void realBearerFilterUsesPrincipalInsteadOfClientUserId() throws Exception {
        when(jwtUtil.extractUserId("test-token")).thenReturn(7L);
        when(userDetails.loadUserById(7L)).thenReturn(principal("USER"));
        when(service.submit(eq(7L), any(), any())).thenReturn(new OrganizerApplicationResponse(
                42L, OrganizerProfileStatus.PENDING_REVIEW, LocalDateTime.of(2026, 11, 3, 1, 0)));
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS)).file(license())
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(201)).andExpect(jsonPath("$.data.id").value(42))
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.fileUrl").doesNotExist());
        verify(service).submit(eq(7L), any(SubmitOrganizerApplicationRequest.class), any());
    }

    @Test
    void rejectsAnonymousAndAdministrator() throws Exception {
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS)).file(license()))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS)).file(license()).with(user(principal("ADMIN"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void returnsFieldErrorsAndRejectsMissingDocumentAndUnknownType() throws Exception {
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS.replace("Company", " "))).file(license()).with(user(principal("USER"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.legalName").exists());
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS)).with(user(principal("USER"))))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS.replace("LIMITED_LIABILITY", "INDIVIDUAL"))).file(license()).with(user(principal("USER"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void returnsConflictForDuplicateSubmission() throws Exception {
        when(service.submit(eq(7L), any(), any())).thenThrow(new ConflictException("Application already exists"));
        mvc.perform(multipart("/api/organizer/applications").file(details(DETAILS)).file(license()).with(user(principal("ORGANIZER"))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.success").value(false));
    }
}
