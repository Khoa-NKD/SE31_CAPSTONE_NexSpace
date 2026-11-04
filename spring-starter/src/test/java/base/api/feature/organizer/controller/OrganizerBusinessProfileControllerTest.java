package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.request.UpdateOrganizerBusinessProfileRequest;
import base.api.feature.organizer.dto.response.OrganizerBusinessProfileResponse;
import base.api.feature.organizer.service.OrganizerBusinessProfileService;
import base.api.shared.config.JwtAuthenticationFilter;
import base.api.shared.config.JwtUtil;
import base.api.shared.config.SecurityConfig;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.BusinessType;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = OrganizerBusinessProfileController.class, properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerBusinessProfileControllerTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    base.api.feature.organizer.repository.IOrganizerProfileRepository operationalProfiles;
    private static final String URL = "/api/organizer/business-profile";
    private static final String BODY = """
            {"address":" 123 Example Street ","contactEmail":" contact@example.test ","contactPhone":" 0901234567 "}
            """;
    @Autowired MockMvc mvc;
    @MockitoBean OrganizerBusinessProfileService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;

    private AuthUser principal(String role) {
        var account = new UserModel();
        account.setId(7L);
        account.setUserName("organizer");
        account.setRoleEntity(new RoleModel(role, null));
        return new AuthUser(account);
    }

    private OrganizerBusinessProfileResponse response() {
        return new OrganizerBusinessProfileResponse(42L, "Example Company", BusinessType.LIMITED_LIABILITY,
                "TEST-TAX-123", "Test Representative", "123 Example Street", "contact@example.test", "0901234567");
    }

    @Test
    void suspendedOrganizerCannotReadOrWriteBusinessManagement() throws Exception {
        when(operationalProfiles.existsByOrganizerIdAndSuspendedTrue(7L)).thenReturn(true);
        mvc.perform(get(URL).with(user(principal("ORGANIZER")))).andExpect(status().isForbidden());
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void readsOwnedBusinessInformationThroughTheBearerSecurityChain() throws Exception {
        when(jwtUtil.extractUserId("fixture-token")).thenReturn(7L);
        when(userDetails.loadUserById(7L)).thenReturn(principal("ORGANIZER"));
        when(service.getCurrentProfile(7L)).thenReturn(response());
        mvc.perform(get(URL).header("Authorization", "Bearer fixture-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.legalName").value("Example Company"))
                .andExpect(jsonPath("$.data.bankAccountNumber").doesNotExist())
                .andExpect(jsonPath("$.data.fileUrl").doesNotExist())
                .andExpect(jsonPath("$.data.reviewFeedback").doesNotExist());
        verify(service).getCurrentProfile(7L);
    }

    @Test
    void updatesValidatedTrimmedContactsUsingOnlyThePrincipalIdentity() throws Exception {
        when(service.updateCurrentProfile(eq(7L), any())).thenReturn(response());
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.contactEmail").value("contact@example.test"));
        verify(service).updateCurrentProfile(7L,
                new UpdateOrganizerBusinessProfileRequest("123 Example Street", "contact@example.test", "0901234567"));
    }

    @Test
    void rejectsAnonymousRequestsForBothMethods() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ADMIN"})
    void rejectsOtherRolesForBothMethods(String role) throws Exception {
        mvc.perform(get(URL).with(user(principal(role)))).andExpect(status().isForbidden());
        mvc.perform(put(URL).with(user(principal(role))).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"legalName", "businessType", "taxId", "representativeName", "userId", "organizerId",
            "id", "role", "status", "createdAt", "updatedAt", "submittedAt", "reviewedAt", "bankAccountNumber", "description"})
    void rejectsProtectedAndUnknownFieldsInsteadOfSilentlyIgnoringThem(String field) throws Exception {
        String body = BODY.trim().replace("}", ",\"" + field + "\":\"attempted-change\"}");
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void reportsFieldValidationErrorsAndRejectsOversizedAddress() throws Exception {
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"address\":\" \",\"contactEmail\":\"invalid\",\"contactPhone\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.address").exists())
                .andExpect(jsonPath("$.errors.contactEmail").exists())
                .andExpect(jsonPath("$.errors.contactPhone").exists());
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.replace("123 Example Street", "x".repeat(501))))
                .andExpect(status().isBadRequest());
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void preservesNotFoundAndInvalidStateErrorContracts() throws Exception {
        when(service.getCurrentProfile(7L)).thenThrow(new NotFoundException("Business profile not found"));
        when(service.updateCurrentProfile(eq(7L), any())).thenThrow(new ConflictException("Approved profile required"));
        mvc.perform(get(URL).with(user(principal("ORGANIZER"))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.statusCode").value(404));
        mvc.perform(put(URL).with(user(principal("ORGANIZER"))).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.statusCode").value(409));
    }
}
