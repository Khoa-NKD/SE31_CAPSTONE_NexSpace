package base.api.feature.organizer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.io.IOException;
import java.net.http.*;
import java.time.*;
import java.util.List;
import java.nio.ByteBuffer;
import java.util.concurrent.Flow;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BankCatalogServiceTest {
    private static final String BODY = """
        {"code":"00","data":[{"code":"VCB","bin":"970436","name":"Example legal bank name","shortName":"Vietcombank","logo":"https://cdn.vietqr.io/img/VCB.png"}]}
        """;
    private final HttpClient client = mock(HttpClient.class);
    private final Clock clock = mock(Clock.class);
    private final BankCatalogService service = new BankCatalogService(client, new ObjectMapper(), clock);
    private final Instant now = Instant.parse("2026-11-05T00:00:00Z");

    @SuppressWarnings("unchecked")
    private HttpResponse<byte[]> response(String body) {
        var response = (HttpResponse<byte[]>) mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return response;
    }

    @Test void cachesDailyAndRetainsLastGoodCatalogAfterProviderFailure() throws Exception {
        when(clock.instant()).thenReturn(now);
        when(client.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenAnswer(invocation -> response(BODY));
        var banks = service.list();
        assertThat(banks).hasSize(1);
        assertThat(banks.get(0).logo()).isEqualTo("https://cdn.vietqr.io/img/VCB.png");
        assertThat(service.list()).isSameAs(banks);
        var request = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).send(request.capture(), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
        assertThat(request.getValue().uri().toString()).isEqualTo("https://api.vietqr.io/v2/banks");
        when(clock.instant()).thenReturn(now.plus(Duration.ofDays(2)));
        when(client.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenThrow(new IOException("Provider unavailable"));
        assertThat(service.list()).isEqualTo(banks);
        assertThat(service.list()).isEqualTo(banks);
        verify(client, times(2)).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
    }

    @Test void initialFailureIsSanitizedAndUsesCooldown() throws Exception {
        when(clock.instant()).thenReturn(now);
        when(client.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenThrow(new IOException("Internal provider error"));
        assertThatThrownBy(service::list).isInstanceOf(BankCatalogUnavailableException.class).hasMessageNotContaining("Internal provider");
        assertThatThrownBy(service::list).isInstanceOf(BankCatalogUnavailableException.class);
        verify(client).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
    }

    @Test void rejectsInvalidPayloadsAndStripsUntrustedLogoUrls() throws Exception {
        when(clock.instant()).thenReturn(now);
        when(client.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenAnswer(invocation -> response(BODY.replace("https://cdn.vietqr.io/img/VCB.png", "https://untrusted.example/logo.svg")));
        assertThat(service.list().get(0).logo()).isNull();
        for (String invalid : List.of("", "{not-json}", "{\"code\":\"00\",\"data\":[]}", BODY.replace("970436", "invalid"))) {
            var isolated = new BankCatalogService(client, new ObjectMapper(), clock);
            when(client.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenAnswer(invocation -> response(invalid));
            assertThatThrownBy(isolated::list).isInstanceOf(BankCatalogUnavailableException.class);
        }
    }

    @Test void subscriberCancelsOversizedResponses() {
        var subscriber = BankCatalogService.boundedBody().apply(null);
        var subscription = mock(Flow.Subscription.class);
        subscriber.onSubscribe(subscription);
        subscriber.onNext(List.of(ByteBuffer.allocate(256 * 1024 + 1)));
        verify(subscription).cancel();
        assertThatThrownBy(() -> subscriber.getBody().toCompletableFuture().join()).hasCauseInstanceOf(IOException.class);
    }
}
