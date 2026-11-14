package base.api.feature.resource.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import base.api.feature.resource.dto.FloorDesign;
import base.api.shared.exception.ConflictException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.*;

/** Provider failures are simulated: no API calls, credentials or database access. */
class GeminiFloorDesignerTest {
    private HttpClient http;
    private ValidatorFactory factory;
    private GeminiFloorDesigner designer;
    private final ObjectMapper mapper = new ObjectMapper();
    @BeforeEach void setUp() {
        http = mock(HttpClient.class);
        factory = Validation.buildDefaultValidatorFactory();
        designer = new GeminiFloorDesigner(mapper, factory.getValidator(), "test-key", "test-model", http);
    }
    @AfterEach void close() { factory.close(); }

    private HttpResponse<InputStream> response(int code, String body) {
        return new HttpResponse<>() {
            public int statusCode() { return code; }
            public HttpRequest request() { return HttpRequest.newBuilder(java.net.URI.create("https://example.test")).build(); }
            public java.util.Optional<HttpResponse<InputStream>> previousResponse() { return java.util.Optional.empty(); }
            public HttpHeaders headers() { return HttpHeaders.of(Map.of(), (name, value) -> true); }
            public InputStream body() { return new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)); }
            public java.util.Optional<javax.net.ssl.SSLSession> sslSession() { return java.util.Optional.empty(); }
            public java.net.URI uri() { return java.net.URI.create("https://example.test"); }
            public HttpClient.Version version() { return HttpClient.Version.HTTP_2; }
        };
    }
    private String successfulBody() throws Exception {
        String text = mapper.writeValueAsString(Map.of("message", "Preview only", "question", "",
                "resources", List.of(), "removeResourceIds", List.of(), "decorations", List.of(), "templates", List.of(), "newTypes", List.of()));
        return mapper.writeValueAsString(Map.of("candidates", List.of(Map.of("finishReason", "STOP",
                "content", Map.of("parts", List.of(Map.of("text", text)))))));
    }
    @Test void transientFailureRetriesOnceAndReturnsValidatedPreview() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(503, "{\"error\":{\"status\":\"UNAVAILABLE\"}}"), response(200, successfulBody()));
        assertThat(designer.design(Map.of("prompt", "Preview only")).message()).isEqualTo("Preview only");
        verify(http, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
    @Test void repeatedServiceFailureReportsActualHttpStatusWithoutProviderBody() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(503, "private-provider-detail"), response(503, "private-provider-detail"),
                        response(200, "{\"models\":[]}"));
        assertThatThrownBy(() -> designer.design(Map.of())).isInstanceOf(ConflictException.class)
                .hasMessageContaining("HTTP 503").hasMessageNotContaining("private-provider-detail");
        verify(http, times(3)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
    @Test void switchesToAnotherModelAfterRepeatedHttp503() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(503, "{}"), response(503, "{}"), response(200, """
                        {"models":[{"name":"models/gemini-fallback","supportedGenerationMethods":["generateContent"]}]}
                        """), response(200, successfulBody()));

        assertThat(designer.design(Map.of("prompt", "Preview only")).message()).isEqualTo("Preview only");
        var requests = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(4)).send(requests.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(requests.getAllValues().get(3).uri().getPath()).endsWith("/gemini-fallback:generateContent");
    }
    @Test void switchesAfterQuotaFailureAndStartsTheNextRequestWithTheWorkingModel() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(404, "{\"error\":{\"status\":\"NOT_FOUND\"}}"), response(200, """
                        {"models":[
                          {"name":"models/gemini-first","supportedGenerationMethods":["generateContent"]},
                          {"name":"models/gemini-second","supportedGenerationMethods":["generateContent"]}
                        ]}
                        """), response(429, "{}"), response(200, successfulBody()),
                        response(200, successfulBody()));
        assertThat(designer.design(Map.of()).message()).isEqualTo("Preview only");
        assertThat(designer.design(Map.of("prompt", "Next design")).message()).isEqualTo("Preview only");
        var requests = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(5)).send(requests.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(requests.getAllValues().get(2).uri().getPath()).endsWith("/gemini-first:generateContent");
        assertThat(requests.getAllValues().get(3).uri().getPath()).endsWith("/gemini-second:generateContent");
        assertThat(requests.getAllValues().get(4).uri().getPath()).endsWith("/gemini-second:generateContent");
    }
    @Test void discoversPagedDesignModelsAndSendsOnlyAnAvailableSelection() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(200, """
                        {"models":[
                          {"name":"models/gemini-3.6-flash","supportedGenerationMethods":["generateContent"]},
                          {"name":"models/gemini-3-pro-preview","supportedGenerationMethods":["generateContent"]},
                          {"name":"models/gemini-image","supportedGenerationMethods":["generateContent"]},
                          {"name":"models/gemini-embed","supportedGenerationMethods":["embedContent"]}
                        ],"nextPageToken":"page+two"}
                        """), response(200, """
                        {"models":[{"name":"models/gemini-3.1-pro-preview","displayName":"Gemini Pro",
                          "supportedGenerationMethods":["generateContent"]}]}
                        """), response(200, successfulBody()));
        var options = designer.statusWithModels().models();
        assertThat(options).extracting(FloorDesign.ModelOption::id)
                .containsExactly("gemini-3.1-pro-preview", "gemini-3.6-flash");
        assertThatThrownBy(() -> designer.design(Map.of(), null, "gemini-3-pro-preview"))
                .hasMessageContaining("retired");
        assertThatThrownBy(() -> designer.design(Map.of(), null, "gemini-unlisted"))
                .hasMessageContaining("unavailable");
        assertThat(designer.design(Map.of(), null, "gemini-3.1-pro-preview").message()).isEqualTo("Preview only");
        var requests = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(3)).send(requests.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(requests.getAllValues().get(1).uri().getRawQuery()).contains("pageToken=page%2Btwo");
        assertThat(requests.getAllValues().get(2).uri().getPath())
                .endsWith("/gemini-3.1-pro-preview:generateContent");
    }
    @Test void hidesListedModelAfterGenerationReturnsNotFound() throws Exception {
        String model = "gemini-2.5-flash-lite";
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(200, """
                        {"models":[{"name":"models/gemini-2.5-flash-lite","supportedGenerationMethods":["generateContent"]}]}
                        """), response(404, "{\"error\":{\"status\":\"NOT_FOUND\"}}"));
        assertThat(designer.statusWithModels().models()).extracting(FloorDesign.ModelOption::id).containsExactly(model);
        assertThatThrownBy(() -> designer.design(Map.of(), null, model)).hasMessageContaining("No Gemini model");
        assertThat(designer.statusWithModels().models()).isEmpty();
        assertThatThrownBy(() -> designer.design(Map.of(), null, model)).hasMessageContaining("unavailable");
        verify(http, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
    @Test void invalidKeyOnHttp400IsNotMisreportedAsSchemaFailure() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(400, "{\"error\":{\"status\":\"INVALID_ARGUMENT\",\"details\":[{\"reason\":\"API_KEY_INVALID\"}]}}"));
        assertThatThrownBy(() -> designer.design(Map.of())).hasMessageContaining("API key").hasMessageContaining("HTTP 400");
        verify(http).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
    @Test void reportsQuotaOnlyAfterAllModelsFail() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenReturn(response(429, "{\"error\":{\"status\":\"RESOURCE_EXHAUSTED\",\"message\":\"private-provider-detail\"}}"),
                        response(200, """
                                {"models":[{"name":"models/gemini-fallback","supportedGenerationMethods":["generateContent"]}]}
                                """),
                        response(429, "{}"));
        assertThatThrownBy(() -> designer.design(Map.of())).hasMessageContaining("All available Gemini models")
                .hasMessageNotContaining("private-provider-detail");
        verify(http, times(3)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
}
