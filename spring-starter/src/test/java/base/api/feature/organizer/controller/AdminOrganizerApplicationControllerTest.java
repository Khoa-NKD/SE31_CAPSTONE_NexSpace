package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationResponse;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationDetailsResponse;
import base.api.feature.organizer.dto.response.AdminOrganizerDocumentResponse;
import base.api.feature.organizer.service.AdminOrganizerApplicationService;
import base.api.feature.organizer.service.AdminOrganizerApplicationDetailsService;
import base.api.shared.config.*;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.*;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = AdminOrganizerApplicationController.class, properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class AdminOrganizerApplicationControllerTest {
    static final String URL = "/api/admin/organizer-applications";
    @Autowired MockMvc mvc;
    @MockitoBean AdminOrganizerApplicationService service;
    @MockitoBean AdminOrganizerApplicationDetailsService detailsService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;

    AuthUser principal(String role) {
        var account = new UserModel(); account.setId(1L); account.setUserName("fixture.admin"); account.setRoleEntity(new RoleModel(role, null));
        return new AuthUser(account);
    }

    @Test
    void detailsRequiresAdminAndDoesNotExposePrivateFields() throws Exception {
        mvc.perform(get(URL + "/7")).andExpect(status().isUnauthorized());
        for (String role : List.of("USER", "ORGANIZER"))
            mvc.perform(get(URL + "/7").with(user(principal(role)))).andExpect(status().isForbidden());
        verifyNoInteractions(detailsService);
        var date = LocalDateTime.of(2026, 11, 5, 8, 0);
        var document = new AdminOrganizerDocumentResponse(9L, OrganizerDocumentType.BUSINESS_LICENSE,
                "license.pdf", OrganizerDocumentStatus.VERIFIED, date, true, "Checked");
        var dto = new AdminOrganizerApplicationDetailsResponse(7L, "Company", BusinessType.LIMITED_LIABILITY,
                "0400000123", "Representative", "12 Test Street", "contact@example.test", "0900000123",
                new AdminOrganizerApplicationDetailsResponse.Applicant(42L, "applicant", "applicant@example.test", "Test Applicant"),
                OrganizerProfileStatus.APPROVED, date, date, "Accepted", List.of(document), "Offer flexible workspaces to local businesses.");
        when(detailsService.getDetails(1L, 7L)).thenReturn(dto);
        when(jwtUtil.extractUserId("fixture-admin-token")).thenReturn(1L);
        when(userDetails.loadUserById(1L)).thenReturn(principal("ADMIN"));
        mvc.perform(get(URL + "/7").header("Authorization", "Bearer fixture-admin-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.applicant.id").value(42))
                .andExpect(jsonPath("$.data.taxId").value("0400000123"))
                .andExpect(jsonPath("$.data.reviewFeedback").value("Accepted"))
                .andExpect(jsonPath("$.data.documents[0].current").value(true))
                .andExpect(jsonPath("$.data.documents[0].status").value("VERIFIED"))
                .andExpect(jsonPath("$.data.documents[0].fileUrl").doesNotExist())
                .andExpect(jsonPath("$.data.documents[0].storageKey").doesNotExist())
                .andExpect(jsonPath("$.data.bankAccountNumber").doesNotExist())
                .andExpect(jsonPath("$.data.applicant.password").doesNotExist())
                .andExpect(jsonPath("$.data.applicant.twoFactorSecret").doesNotExist())
                .andExpect(jsonPath("$.data.registrationReason").value("Offer flexible workspaces to local businesses."))
                .andExpect(jsonPath("$.data.history").doesNotExist());
        verify(detailsService).getDetails(1L, 7L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "1.5", "9223372036854775808"})
    void detailsRejectsMalformedLongId(String id) throws Exception {
        mvc.perform(get(URL + "/" + id).with(user(principal("ADMIN"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(detailsService);
    }

    @Test
    void detailsPreservesErrorsAndHasNoWriteOperation() throws Exception {
        when(detailsService.getDetails(1L, 7L)).thenThrow(new NotFoundException("Submitted organizer application not found"));
        mvc.perform(get(URL + "/7").with(user(principal("ADMIN"))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.statusCode").value(404));
        when(detailsService.getDetails(1L, 0L)).thenThrow(new BadRequestException("Invalid application ID"));
        mvc.perform(get(URL + "/0").with(user(principal("ADMIN")))).andExpect(status().isBadRequest());
        mvc.perform(post(URL + "/7").with(user(principal("ADMIN")))).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void realBearerAdminReceivesCanonicalPageAndNoPrivateFields() throws Exception {
        when(jwtUtil.extractUserId("fixture-admin-token")).thenReturn(1L);
        when(userDetails.loadUserById(1L)).thenReturn(principal("ADMIN"));
        var row = new AdminOrganizerApplicationResponse(42L, "Company", BusinessType.LIMITED_LIABILITY,
                7L, "applicant", "applicant@example.test", OrganizerProfileStatus.APPROVED,
                LocalDateTime.of(2026, 11, 5, 8, 0), LocalDateTime.of(2026, 11, 5, 9, 0));
        when(service.list(eq(1L), any(), eq(OrganizerProfileStatus.APPROVED)))
                .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(1, 10), 31));
        mvc.perform(get(URL).header("Authorization", "Bearer fixture-admin-token")
                        .param("page", "2").param("size", "10").param("status", "APPROVED").param("search", "Company").param("sortBy", "reviewedAt").param("sortDir", "asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.pageNumber").value(2)).andExpect(jsonPath("$.data.totalRecords").value(31))
                .andExpect(jsonPath("$.data.listObjects[0].applicantUserName").value("applicant"))
                .andExpect(jsonPath("$.data.listObjects[0].reviewedAt").value("2026-11-05T09:00:00"))
                .andExpect(jsonPath("$.data.listObjects[0].fileUrl").doesNotExist())
                .andExpect(jsonPath("$.data.listObjects[0].password").doesNotExist())
                .andExpect(jsonPath("$.data.listObjects[0].bankAccountNumber").doesNotExist())
                .andExpect(jsonPath("$.data.listObjects[0].reviewFeedback").doesNotExist());
        verify(service).list(eq(1L), argThat(p -> p.getPage() == 2 && p.getSize() == 10 && "reviewedAt".equals(p.getSortBy()) && "Company".equals(p.getSearch())), eq(OrganizerProfileStatus.APPROVED));
    }

    @Test
    void rejectsAnonymousUserAndOrganizer() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        for (String role : List.of("USER", "ORGANIZER")) mvc.perform(get(URL).with(user(principal(role)))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"page=abc", "size=abc", "status=SUSPENDED", "status=UNKNOWN"})
    void rejectsInvalidBinding(String parameter) throws Exception {
        var parts = parameter.split("=");
        mvc.perform(get(URL).param(parts[0], parts[1]).with(user(principal("ADMIN")))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void returnsEmptyPageAndBadRequestEnvelopeAndHasNoWriteOperation() throws Exception {
        when(service.list(eq(1L), any(), isNull())).thenReturn(Page.empty(PageRequest.of(0, 20)));
        mvc.perform(get(URL).with(user(principal("ADMIN"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.listObjects").isEmpty()).andExpect(jsonPath("$.data.totalRecords").value(0));
        when(service.list(eq(1L), any(), isNull())).thenThrow(new BadRequestException("Unsupported application sort field"));
        mvc.perform(get(URL).param("sortBy", "password").with(user(principal("ADMIN")))).andExpect(status().isBadRequest());
        mvc.perform(post(URL).with(user(principal("ADMIN")))).andExpect(status().isMethodNotAllowed());
    }
}
