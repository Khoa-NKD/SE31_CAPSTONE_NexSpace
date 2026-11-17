package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.response.OrganizerVerificationDocumentResponse;
import base.api.feature.organizer.dto.response.OrganizerVerificationDocumentsResponse;
import base.api.feature.organizer.service.OrganizerVerificationDocumentService;
import base.api.shared.config.JwtAuthenticationFilter;
import base.api.shared.config.JwtUtil;
import base.api.shared.config.SecurityConfig;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.OrganizerDocumentStatus;
import base.api.shared.enums.OrganizerDocumentType;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = OrganizerVerificationDocumentController.class, properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerVerificationDocumentControllerTest {
    private static final String URL = "/api/organizer/verification-documents";
    @Autowired MockMvc mvc;
    @MockitoBean OrganizerVerificationDocumentService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;

    private AuthUser principal(String role) {
        var account = new UserModel(); account.setId(7L); account.setUserName("applicant");
        account.setRoleEntity(new RoleModel(role, null)); return new AuthUser(account);
    }
    private MockMultipartFile file() {
        return new MockMultipartFile("file", "evidence.pdf", "application/pdf", "%PDF-1.4".getBytes());
    }
    private OrganizerVerificationDocumentResponse receipt() {
        return new OrganizerVerificationDocumentResponse(101L, OrganizerDocumentType.OTHER, "evidence.pdf",
                OrganizerDocumentStatus.PENDING, LocalDateTime.of(2026, 11, 4, 8, 0));
    }

    @Test
    void authenticatesBearerAndReturnsSafeMetadataForThePrincipal() throws Exception {
        when(jwtUtil.extractUserId("fixture-token")).thenReturn(7L);
        when(userDetails.loadUserById(7L)).thenReturn(principal("USER"));
        when(service.upload(eq(7L), eq(OrganizerDocumentType.OTHER), any())).thenReturn(receipt());
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER").header("Authorization", "Bearer fixture-token"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.data.id").value(101)).andExpect(jsonPath("$.data.fileName").value("evidence.pdf"))
                .andExpect(jsonPath("$.data.fileUrl").doesNotExist()).andExpect(jsonPath("$.data.organizerProfile").doesNotExist())
                .andExpect(jsonPath("$.data.adminFeedback").doesNotExist());
        verify(service).upload(eq(7L), eq(OrganizerDocumentType.OTHER), any());
    }

    @Test
    void listsCurrentMetadataAndUploadCapabilityWithoutFilesystemOrApplicationStatus() throws Exception {
        when(service.listCurrentDocuments(7L)).thenReturn(new OrganizerVerificationDocumentsResponse(42L, true,
                5L * 1024 * 1024, List.of(OrganizerDocumentType.OTHER), List.of(receipt())));
        mvc.perform(get(URL).with(user(principal("ORGANIZER"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.profileId").value(42))
                .andExpect(jsonPath("$.data.uploadAllowed").value(true))
                .andExpect(jsonPath("$.data.documents[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data.documents[0].fileUrl").doesNotExist())
                .andExpect(jsonPath("$.data.profileStatus").doesNotExist());
    }

    @Test
    void rejectsAnonymousReadsAndUploads() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void administratorsCannotOperateOnBehalfOfTheOwner() throws Exception {
        mvc.perform(get(URL).with(user(principal("ADMIN")))).andExpect(status().isForbidden());
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER").with(user(principal("ADMIN"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsMissingFileMissingTypeAndUnknownType() throws Exception {
        mvc.perform(multipart(URL).param("documentType", "OTHER").with(user(principal("USER")))).andExpect(status().isBadRequest());
        mvc.perform(multipart(URL).file(file()).with(user(principal("USER")))).andExpect(status().isBadRequest());
        mvc.perform(multipart(URL).file(file()).param("documentType", "OWNERSHIP_CERTIFICATE").with(user(principal("USER"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"profileId", "organizerId", "userId", "status", "isCurrent", "fileUrl",
            "public_id", "resource_type", "type", "folder", "access_control"})
    void rejectsExtraOwnerAndSystemFields(String field) throws Exception {
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER").param(field, "8").with(user(principal("USER"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsMultipleFilesAndTypesRatherThanTreatingTheRequestAsBulkUpload() throws Exception {
        mvc.perform(multipart(URL).file(file()).file(file()).param("documentType", "OTHER").with(user(principal("USER"))))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER", "ID_CARD_FRONT").with(user(principal("USER"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void preservesDuplicateConflictMissingProfileAndMultipartLimitContracts() throws Exception {
        when(service.listCurrentDocuments(7L)).thenThrow(new NotFoundException("Organizer profile not found"));
        mvc.perform(get(URL).with(user(principal("USER")))).andExpect(status().isNotFound());
        when(service.upload(eq(7L), any(), any())).thenThrow(new ConflictException("Current document already exists"));
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER").with(user(principal("USER"))))
                .andExpect(status().isConflict());
        when(service.upload(eq(7L), any(), any())).thenThrow(new MaxUploadSizeExceededException(5L * 1024 * 1024));
        mvc.perform(multipart(URL).file(file()).param("documentType", "OTHER").with(user(principal("USER"))))
                .andExpect(status().isPayloadTooLarge()).andExpect(jsonPath("$.statusCode").value(413));
        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}").with(user(principal("USER"))))
                .andExpect(status().isUnsupportedMediaType());
    }
}
