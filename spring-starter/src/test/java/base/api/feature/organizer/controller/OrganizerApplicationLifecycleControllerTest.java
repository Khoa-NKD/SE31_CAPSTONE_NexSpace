package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.request.OrganizerLifecycleRequests.*;
import base.api.feature.organizer.dto.response.OrganizerLifecycleContext;
import base.api.feature.organizer.service.OrganizerApplicationLifecycleService;
import base.api.shared.config.*;
import base.api.shared.entity.*;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.security.*;
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
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value=OrganizerApplicationLifecycleController.class, properties="spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerApplicationLifecycleControllerTest {
    static final String ADMIN="/api/admin/organizer-applications/42";
    static final String OWNER="/api/organizer/applications/current";
    @Autowired MockMvc mvc;
    @MockitoBean OrganizerApplicationLifecycleService service;
    @MockitoBean JwtUtil jwt;
    @MockitoBean CustomUserDetailsService users;
    @MockitoBean ITokenRevocationService revocations;
    AuthUser principal(String role) {
        var account=new UserModel(); account.setId(7L);account.setUserName("actor");account.setRoleEntity(new RoleModel(role,null));
        return new AuthUser(account);
    }
    OrganizerLifecycleContext response() {
        return new OrganizerLifecycleContext(42L,OrganizerProfileStatus.PENDING_REVIEW,12L,false,null,true,true,false,false,List.of(9L));
    }
    @Test void anonymousAndWrongRolesCannotReview() throws Exception {
        for(String action:List.of("approve","reject","suspend")) {
            mvc.perform(post(ADMIN+"/"+action).contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isUnauthorized());
            for(String role:List.of("USER","ORGANIZER")) mvc.perform(post(ADMIN+"/"+action).with(user(principal(role))).contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isForbidden());
        }
        mvc.perform(post(OWNER+"/resubmit").with(user(principal("ADMIN"))).contentType(MediaType.APPLICATION_JSON).content("{\"revision\":0}")) .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void approvalUsesAuthenticatedActorAndExactReviewedDocumentSet() throws Exception {
        when(service.approve(eq(7L),eq(42L),any())).thenReturn(response());
        mvc.perform(post(ADMIN+"/approve").with(user(principal("ADMIN"))).contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":12,\"documentsConfirmed\":true,\"documentIds\":[9],\"note\":\" checked \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.revision").value(12)).andExpect(jsonPath("$.data.fileUrl").doesNotExist());
        verify(service).approve(7L,42L,new Approval(12L,true,List.of(9L),"checked"));
    }
    @ParameterizedTest @ValueSource(strings={"reject","suspend"})
    void reasonsAreRequiredAndBounded(String action) throws Exception {
        for(String reason:List.of("", "   ", "x".repeat(501)))
            mvc.perform(post(ADMIN+"/"+action).with(user(principal("ADMIN"))).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"revision\":0,\"reason\":\""+reason+"\"}")) .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.reason").exists());
        verifyNoInteractions(service);
    }
    @Test void staleDecisionReturnsConflictEnvelope() throws Exception {
        when(service.reject(eq(7L),eq(42L),any())).thenThrow(new ConflictException("Application changed. Reload latest details"));
        mvc.perform(post(ADMIN+"/reject").with(user(principal("ADMIN"))).contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"reason\":\"Clarify address\"}")) .andExpect(status().isConflict()).andExpect(jsonPath("$.statusCode").value(409));
    }
    @Test void resubmissionAndDocumentCorrectionUseOwnerPrincipalOnly() throws Exception {
        when(service.resubmit(eq(7L),any())).thenReturn(response());
        mvc.perform(post(OWNER+"/resubmit").with(user(principal("USER"))).contentType(MediaType.APPLICATION_JSON).content("{\"revision\":12}")) .andExpect(status().isOk());
        verify(service).resubmit(7L,new Revision(12L));
        when(service.correctDocument(eq(7L),eq(12L),any(),eq(9L),any())).thenReturn(response());
        mvc.perform(multipart(OWNER+"/correction-documents").file(new MockMultipartFile("file","license.pdf","application/pdf","%PDF-test".getBytes()))
                .param("revision","12").param("documentType","BUSINESS_LICENSE").param("expectedCurrentDocumentId","9").with(user(principal("USER")))) .andExpect(status().isOk());
        verify(service).correctDocument(eq(7L),eq(12L),eq(base.api.shared.enums.OrganizerDocumentType.BUSINESS_LICENSE),eq(9L),any());
    }
    @Test void malformedRevisionAndMissingFieldsNeverReachService() throws Exception {
        for(String body:List.of("{}","{\"revision\":-1}","{\"revision\":0,\"role\":\"ORGANIZER\"}"))
            mvc.perform(post(OWNER+"/resubmit").with(user(principal("USER"))).contentType(MediaType.APPLICATION_JSON).content(body)) .andExpect(status().isBadRequest());
        mvc.perform(put(OWNER+"/correction").with(user(principal("USER"))).contentType(MediaType.APPLICATION_JSON).content("{\"revision\":0,\"application\":{}}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
