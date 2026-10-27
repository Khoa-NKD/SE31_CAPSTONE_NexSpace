package base.api.shared.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiIntegrationTest {

  @Autowired private MockMvc mvc;

  @Autowired private ObjectMapper objectMapper;

  @Test
  void swaggerEntryRedirectsToUiWithoutAuthentication() throws Exception {
    mvc.perform(get("/swagger-ui.html"))
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/swagger-ui/index.html"));
  }

  @Test
  void swaggerUiAndAssetsArePublic() throws Exception {
    mvc.perform(get("/swagger-ui/index.html"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("text/html"));
    mvc.perform(get("/swagger-ui/swagger-ui-bundle.js")).andExpect(status().isOk());
  }

  @Test
  void apiDescriptionIncludesNexSpaceMetadataAndJwtScheme() throws Exception {
    mvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.info.title").value("NexSpace API"))
        .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
        .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
        .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.bearerFormat").value("JWT"))
        .andExpect(jsonPath("$.security[0].bearerAuth").isArray());
  }

  @Test
  void yamlDescriptionIsPublic() throws Exception {
    var response =
        mvc.perform(get("/v3/api-docs.yaml")).andExpect(status().isOk()).andReturn().getResponse();
    assertThat(response.getContentAsString()).contains("openapi:", "NexSpace API");
  }

  @Test
  void swaggerConfigurationUsesLocalApiDescription() throws Exception {
    mvc.perform(get("/v3/api-docs/swagger-config"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.url").value("/v3/api-docs"))
        .andExpect(jsonPath("$.persistAuthorization").value(false));
  }

  @Test
  void publicLoginIsDocumentedWithoutJwtWhileProfileInheritsJwt() throws Exception {
    var result = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn();
    var api = objectMapper.readTree(result.getResponse().getContentAsString());
    var login = api.path("paths").path("/api/v1/auth/login").path("post");
    var profile = api.path("paths").path("/api/v1/auth/me").path("get");
    assertThat(login.isMissingNode()).isFalse();
    assertThat(login.path("security").isArray()).isTrue();
    assertThat(login.path("security").isEmpty()).isTrue();
    assertThat(profile.isMissingNode()).isFalse();
    // An absent operation-level override inherits the global JWT requirement.
    assertThat(profile.has("security")).isFalse();
    assertThat(api.path("security").get(0).has("bearerAuth")).isTrue();
  }

  @Test
  void documentingPublicEndpointsDoesNotExposeProtectedApis() throws Exception {
    mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
  }

  @Test
  void errorEnvelopeAndRequestIdsAreSharedWithSecurityAndValidation() throws Exception {
    mvc.perform(get("/api/v1/auth/me").header("X-Request-ID", "contract-test-123"))
        .andExpect(status().isUnauthorized())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                .string("X-Request-ID", "contract-test-123"))
        .andExpect(jsonPath("$.requestId").value("contract-test-123"))
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.error").value("Unauthorized"))
        .andExpect(jsonPath("$.path").value("/api/v1/auth/me"));
    mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                    "/api/v1/auth/register")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.validationErrors.email").exists())
        .andExpect(jsonPath("$.validationErrors.password").exists());
    assertThat(org.slf4j.MDC.get("requestId")).isNull();
  }

  @Test
  void healthAndCorsSupportTheFrontendWithoutExposingManagementDetails() throws Exception {
    mvc.perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist());
    mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options(
                    "/api/v1/auth/me")
                .header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "Authorization,X-Request-ID"))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                .string("Access-Control-Allow-Origin", "http://localhost:3000"));
    mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
  }

  @Test
  void unsafeRequestIdIsReplacedAndInvalidTokensUseTheCanonicalEnvelope() throws Exception {
    var response =
        mvc.perform(
                get("/api/v1/auth/me")
                    .header("Authorization", "Bearer invalid")
                    .header("X-Request-ID", "bad id with spaces"))
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse();
    var id = response.getHeader("X-Request-ID");
    assertThat(java.util.UUID.fromString(id)).isNotNull();
    assertThat(objectMapper.readTree(response.getContentAsString()).path("requestId").asText())
        .isEqualTo(id);
    assertThat(org.slf4j.MDC.get("requestId")).isNull();
  }
}
