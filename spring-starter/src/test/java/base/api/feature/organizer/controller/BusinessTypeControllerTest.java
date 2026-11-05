package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.dto.response.BusinessTypeResponse;
import base.api.feature.organizer.service.BusinessTypeService;
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

@WebMvcTest(value=BusinessTypeController.class,properties="spring.profiles.active=test")
@Import({SecurityConfig.class,JwtAuthenticationFilter.class,CurrentUserProvider.class})
class BusinessTypeControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean BusinessTypeService service;
    @MockitoBean JwtUtil jwt;
    @MockitoBean CustomUserDetailsService users;
    @MockitoBean ITokenRevocationService revocations;
    @Test void readsPublicBilingualCatalogThroughExistingEnvelopeWithoutLogin()throws Exception {
        when(service.list()).thenReturn(List.of(new BusinessTypeResponse("JOINT_STOCK","Công ty cổ phần","Joint stock company",10)));
        mvc.perform(get("/api/public/business-types")).andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data[0].code").value("JOINT_STOCK"))
                .andExpect(jsonPath("$.data[0].nameVi").value("Công ty cổ phần"))
                .andExpect(jsonPath("$.data[0].nameEn").value("Joint stock company"));
        verify(service).list();
    }
}
