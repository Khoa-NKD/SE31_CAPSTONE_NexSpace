package base.api.feature.operations;

import base.api.feature.operations.controller.OrganizerOperationsController;
import base.api.feature.operations.service.OrganizerOperationsService;
import base.api.feature.operations.dto.OperationsDtos.*;
import base.api.shared.security.CurrentUserProvider;
import base.api.shared.exception.GlobalExceptionHandler;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(OrganizerOperationsControllerTest.Config.class)
class OrganizerOperationsControllerTest {
    @Configuration @EnableMethodSecurity static class Config {
        @Bean OrganizerOperationsService service(){return mock(OrganizerOperationsService.class);}
        @Bean CurrentUserProvider currentUserProvider(){return mock(CurrentUserProvider.class);}
        @Bean OrganizerOperationsController controller(OrganizerOperationsService service){return new OrganizerOperationsController(service);}
    }
    @Autowired OrganizerOperationsController controller;
    @Autowired OrganizerOperationsService service;
    @Autowired CurrentUserProvider currentUserProvider;
    @BeforeEach void setup(){reset(service,currentUserProvider);when(currentUserProvider.getCurrentUserId()).thenReturn(1L);}
    @Test @WithMockUser(roles="USER") void customerIsDenied(){assertThatThrownBy(()->controller.pricing(18L)).isInstanceOf(AccessDeniedException.class);verifyNoInteractions(service);}
    @Test @WithMockUser(roles="ADMIN") void adminCannotImpersonateOrganizer(){assertThatThrownBy(()->controller.pricing(18L)).isInstanceOf(AccessDeniedException.class);}
    @Test void unauthenticatedCallerIsDenied(){assertThatThrownBy(()->controller.pricing(18L)).isInstanceOf(AuthenticationCredentialsNotFoundException.class);}
    @Test @WithMockUser(roles="ORGANIZER") void actorComesFromPrincipal(){when(service.pricing(1L,18L)).thenReturn(new Pricing(List.of(),List.of(),List.of()));assertThat(controller.pricing(18L).getBody().getData().rules()).isEmpty();verify(service).pricing(1L,18L);}
    @Test @WithMockUser(roles="ORGANIZER") void invalidBodyAndMissingRangeDoNotReachService() throws Exception {
        var mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/organizer/workspaces/18/blocked-slots").contentType("application/json").content("{\"resourceIds\":[],\"reason\":\"\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/organizer/workspaces/18/blocked-slots")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
