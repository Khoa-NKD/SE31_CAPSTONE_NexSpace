package base.api.feature.analytics;

import base.api.feature.analytics.controller.OrganizerAnalyticsController;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse.Options;
import base.api.feature.analytics.service.OrganizerAnalyticsService;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringJUnitConfig(OrganizerAnalyticsControllerTest.Config.class)
class OrganizerAnalyticsControllerTest {
    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean OrganizerAnalyticsService service() { return mock(OrganizerAnalyticsService.class); }
        @Bean CurrentUserProvider currentUserProvider() { return mock(CurrentUserProvider.class); }
        @Bean OrganizerAnalyticsController controller(OrganizerAnalyticsService service) { return new OrganizerAnalyticsController(service); }
    }
    @Autowired OrganizerAnalyticsController controller;
    @Autowired OrganizerAnalyticsService service;
    @Autowired CurrentUserProvider currentUserProvider;

    @BeforeEach void prepare() { reset(service,currentUserProvider); when(currentUserProvider.getCurrentUserId()).thenReturn(10L); }
    @Test @WithMockUser(roles="ORGANIZER") void organizerCanReadItsOwnOptions() {
        when(service.options(10)).thenReturn(new Options(List.of(),List.of(),List.of()));
        assertThat(controller.options().getBody().getData().workspaces()).isEmpty();
    }
    @Test @WithMockUser(roles="USER") void customerCannotAccessAnalytics() {
        assertThatThrownBy(() -> controller.options()).isInstanceOf(AccessDeniedException.class);
    }
    @Test @WithMockUser(roles="ADMIN") void adminCannotImpersonateOrganizerOnThisEndpoint() {
        assertThatThrownBy(() -> controller.options()).isInstanceOf(AccessDeniedException.class);
    }
    @Test void unauthenticatedCallerIsRejected() {
        assertThatThrownBy(() -> controller.options()).isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }
    @Test @WithMockUser(roles="ORGANIZER") void invalidDatesAndMissingDatesProduceBadRequests() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/organizer/analytics").param("from","2026-11-20").param("to","2026-11-01")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/organizer/analytics").param("from","invalid").param("to","2026-11-01")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/organizer/analytics")).andExpect(status().isBadRequest());
    }
    @Test @WithMockUser(roles="ORGANIZER") void moneyIsJsonTextAndCsvNegotiatesItsContentType() throws Exception {
        var filter = new base.api.feature.analytics.dto.AnalyticsFilter(java.time.LocalDate.of(2026,11,1),java.time.LocalDate.of(2026,11,30),null,null,null,null);
        var summary = new base.api.feature.analytics.dto.OrganizerAnalyticsResponse.Summary(
                0,0,0,0,0,0,0,0,"9007199254740993.01","0.00","9007199254740993.01","0.00","0.0000",0,0,0);
        when(service.report(10,filter)).thenReturn(new base.api.feature.analytics.dto.OrganizerAnalyticsResponse(
                filter,"VND","Asia/Ho_Chi_Minh",java.time.LocalDateTime.of(2026,11,30,12,0),summary,summary,
                List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of()));
        when(service.export(10,filter,null)).thenReturn("Event,Amount (VND)\r\n1,100.00\r\n");
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/organizer/analytics").param("from","2026-11-01").param("to","2026-11-30"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.current.receivedAmount").isString())
                .andExpect(jsonPath("$.data.current.receivedAmount").value("9007199254740993.01"));
        mvc.perform(get("/api/organizer/analytics/export").param("from","2026-11-01").param("to","2026-11-30").accept("text/csv","application/json"))
                .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string("Event,Amount (VND)\r\n1,100.00\r\n"));
    }
}
