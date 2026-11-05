package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.response.BankOptionResponse;
import base.api.feature.organizer.service.BankCatalogService;
import base.api.shared.config.*;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value=BankCatalogController.class,properties="spring.profiles.active=test")
@Import({SecurityConfig.class,JwtAuthenticationFilter.class,CurrentUserProvider.class})
class BankCatalogControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean BankCatalogService service;
    @MockitoBean JwtUtil jwt;
    @MockitoBean CustomUserDetailsService users;
    @MockitoBean ITokenRevocationService revocations;
    @Test void readsPublicBankCatalogThroughExistingEnvelopeWithoutLogin()throws Exception {
        when(service.list()).thenReturn(List.of(new BankOptionResponse("VCB", "970436", "Example legal bank", "Vietcombank", "https://cdn.vietqr.io/img/VCB.png")));
        mvc.perform(get("/api/public/banks")).andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data[0].code").value("VCB"))
                .andExpect(jsonPath("$.data[0].bin").value("970436"))
                .andExpect(jsonPath("$.data[0].shortName").value("Vietcombank"));
        verify(service).list();
    }

    @Test void providerFailureReturnsServiceUnavailableWithoutLeakingUpstreamErrors() throws Exception {
        when(service.list()).thenThrow(new base.api.feature.organizer.service.BankCatalogUnavailableException());
        mvc.perform(get("/api/public/banks")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.statusCode").value(503));
    }
}
