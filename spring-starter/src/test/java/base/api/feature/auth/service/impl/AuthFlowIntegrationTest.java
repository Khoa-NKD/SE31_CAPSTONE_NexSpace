package base.api.feature.auth.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import base.api.feature.auth.repository.IVerificationChallengeRepository;
import base.api.shared.config.EmailService;
import base.api.shared.util.HashUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "app.auth.email-verification-enabled=true",
      "spring.datasource.url=jdbc:h2:mem:nexspace-email-flow;MODE=MySQL;DB_CLOSE_DELAY=-1"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired IVerificationChallengeRepository challenges;
  @MockitoBean EmailService mail;

  @Test
  void verificationAndRecoveryUseHashedSingleUseProofsAndRevokeSessions() throws Exception {
    String email = "auth-" + UUID.randomUUID() + "@example.com";
    String original = "original-password";
    var registration =
        mvc.perform(
                post("/api/v1/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json.writeValueAsString(
                            Map.of(
                                "email",
                                email,
                                "password",
                                original,
                                "fullName",
                                "Auth Test",
                                "role",
                                "Administrator"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.role").value("Customer"))
            .andExpect(jsonPath("$.data.status").value("Unverified"))
            .andReturn();
    UUID userId =
        UUID.fromString(
            json.readTree(registration.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    login(email, original, 401);
    String verifyToken = lastToken(email);
    var challenge =
        challenges.findAll().stream()
            .filter(c -> c.getUserId().equals(userId))
            .findFirst()
            .orElseThrow();
    assertThat(challenge.getProofHash()).isEqualTo(HashUtils.sha256Hex(verifyToken));
    assertThat(challenge.getProofHash()).isNotEqualTo(verifyToken);
    mvc.perform(get("/api/v1/auth/verify-email").param("token", verifyToken))
        .andExpect(status().isFound())
        .andExpect(redirectedUrl("http://localhost:3000/email/verify-success"));
    mvc.perform(get("/api/v1/auth/verify-email").param("token", verifyToken))
        .andExpect(status().isFound())
        .andExpect(redirectedUrl("http://localhost:3000/email/verify-failed"));
    String access = login(email, original, 200).path("accessToken").asText();
    mvc.perform(
            post("/api/v1/auth/forgot-password/initiate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("contactInfo", email))))
        .andExpect(status().isOk());
    String resetToken = lastToken(email);
    String resetBody =
        json.writeValueAsString(
            Map.of(
                "resetToken",
                resetToken,
                "newPassword",
                "new-password",
                "confirmNewPassword",
                "new-password"));
    mvc.perform(
            post("/api/v1/auth/forgot-password/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resetBody))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + access))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/auth/forgot-password/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resetBody))
        .andExpect(status().isBadRequest());
    login(email, original, 401);
    assertThat(login(email, "new-password", 200).path("user").path("id").asText())
        .isEqualTo(userId.toString());
  }

  private com.fasterxml.jackson.databind.JsonNode login(String email, String password, int status)
      throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("email", email, "password", password))))
            .andExpect(status().is(status))
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).path("data");
  }

  private String lastToken(String email) {
    var html = ArgumentCaptor.forClass(String.class);
    verify(mail, atLeastOnce()).sendHtmlEmail(eq(email), anyString(), html.capture());
    var matcher = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(html.getValue());
    assertThat(matcher.find()).isTrue();
    return matcher.group(1);
  }
}
