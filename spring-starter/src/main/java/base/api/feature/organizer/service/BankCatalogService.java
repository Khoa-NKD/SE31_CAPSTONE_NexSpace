package base.api.feature.organizer.service;

import base.api.feature.organizer.dto.response.BankOptionResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Bounded public catalog fetches; failed refreshes retain the last successful snapshot. */
@Service
public class BankCatalogService {
    private static final URI ENDPOINT = URI.create("https://api.vietqr.io/v2/banks");
    private static final int MAX_BYTES = 256 * 1024;
    private final HttpClient client;
    private final ObjectMapper mapper;
    private final Clock clock;
    private List<BankOptionResponse> cached = List.of();
    private Instant refreshAfter = Instant.MIN;

    @Autowired
    public BankCatalogService(ObjectMapper mapper) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NEVER).build(), mapper, Clock.systemUTC());
    }

    BankCatalogService(HttpClient client, ObjectMapper mapper, Clock clock) {
        this.client = client;
        this.mapper = mapper;
        this.clock = clock;
    }

    public synchronized List<BankOptionResponse> list() {
        Instant now = clock.instant();
        if (!now.isBefore(refreshAfter)) {
            try {
                cached = fetch();
                refreshAfter = now.plus(Duration.ofDays(1));
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                refreshAfter = now.plusSeconds(60);
            } catch (IOException | IllegalArgumentException ex) {
                refreshAfter = now.plusSeconds(60);
            }
        }
        if (cached.isEmpty()) throw new BankCatalogUnavailableException();
        return cached;
    }

    private List<BankOptionResponse> fetch() throws IOException, InterruptedException {
        var request = HttpRequest.newBuilder(ENDPOINT).timeout(Duration.ofSeconds(6))
                .header("Accept", "application/json").GET().build();
        var response = client.send(request, boundedBody());
        if (response.statusCode() != 200) throw new IOException("Catalog request failed");
        var root = mapper.readTree(response.body());
        if (root == null) throw new IOException("Empty catalog response");
        var data = root.path("data");
        if (!"00".equals(root.path("code").asText()) || !data.isArray() || data.isEmpty() || data.size() > 250) {
            throw new IOException("Invalid catalog response");
        }
        var options = new ArrayList<BankOptionResponse>();
        var bins = new HashSet<String>();
        for (var row : data) {
            String bin = row.path("bin").asText("").trim();
            String code = row.path("code").asText("").trim();
            String name = row.path("name").asText("").trim();
            String shortName = row.path("shortName").asText("").trim();
            if (!bin.matches("[0-9]{6}") || code.isEmpty() || code.length() > 30 || name.isEmpty()
                    || name.length() > 250 || shortName.isEmpty() || shortName.length() > 100 || !bins.add(bin)) {
                throw new IOException("Invalid bank entry");
            }
            options.add(new BankOptionResponse(code, bin, name, shortName, safeLogo(row.path("logo").asText(""))));
        }
        options.sort(Comparator.comparing(BankOptionResponse::shortName, String.CASE_INSENSITIVE_ORDER));
        return List.copyOf(options);
    }

    /** Limit the body while it arrives, retaining the HTTP request's overall timeout. */
    static HttpResponse.BodyHandler<byte[]> boundedBody() {
        return info -> new HttpResponse.BodySubscriber<byte[]>() {
            private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
            private java.util.concurrent.Flow.Subscription subscription;
            private int bytes;
            private boolean exceeded;
            public java.util.concurrent.CompletionStage<byte[]> getBody() { return delegate.getBody(); }
            public void onSubscribe(java.util.concurrent.Flow.Subscription value) {
                subscription = value;
                delegate.onSubscribe(value);
            }
            public void onNext(List<java.nio.ByteBuffer> buffers) {
                if (exceeded) return;
                for (var buffer : buffers) {
                    if (buffer.remaining() > MAX_BYTES - bytes) {
                        exceeded = true;
                        subscription.cancel();
                        delegate.onError(new IOException("Catalog response exceeds size limit"));
                        return;
                    }
                    bytes += buffer.remaining();
                }
                delegate.onNext(buffers);
            }
            public void onError(Throwable failure) { if (!exceeded) delegate.onError(failure); }
            public void onComplete() { if (!exceeded) delegate.onComplete(); }
        };
    }

    private String safeLogo(String value) {
        try {
            URI uri = URI.create(value);
            if ("https".equals(uri.getScheme()) && uri.getHost() != null && Set.of("cdn.vietqr.io", "api.vietqr.io").contains(uri.getHost())
                    && uri.getUserInfo() == null && uri.getPort() == -1 && uri.getPath().startsWith("/img/")
                    && value.length() <= 500) return value;
        } catch (IllegalArgumentException ignored) { }
        return null;
    }
}
