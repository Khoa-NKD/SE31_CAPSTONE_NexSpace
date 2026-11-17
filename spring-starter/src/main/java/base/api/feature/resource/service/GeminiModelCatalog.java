package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDesign.ModelAvailability;
import base.api.feature.resource.dto.FloorDesign.ModelOption;
import base.api.shared.exception.ConflictException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Discovers generation models without sending a prompt or exposing provider credentials. */
final class GeminiModelCatalog {
    private static final String MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";
    private static final Pattern MODEL_ID = Pattern.compile("gemini-[a-z0-9._-]{1,92}");
    private static final Pattern SPECIALIZED = Pattern.compile(
            "(?:^|-)(?:embedding|embed|image|audio|tts|live|transcribe|translate|robotics|computer-use|nano-banana|deep-research|agent)(?:-|$)");
    private static final long CACHE_NANOS = Duration.ofMinutes(5).toNanos();
    private static final long LOOKUP_NANOS = Duration.ofSeconds(10).toNanos();
    private static final int MAX_RESPONSE_BYTES = 512_000;
    // Google publishes shutdown dates separately from the ListModels response.
    // https://aistudio.google.com/docs/deprecations
    private static final Map<String, LocalDate> SHUTDOWNS = Map.ofEntries(
            Map.entry("gemini-3.1-flash-lite", LocalDate.of(2027, 5, 7)),
            Map.entry("gemini-2.5-pro", LocalDate.of(2026, 12, 1)),
            Map.entry("gemini-2.5-flash", LocalDate.of(2026, 12, 1)),
            Map.entry("gemini-3-pro-preview", LocalDate.of(2026, 3, 9)),
            Map.entry("gemini-3.1-flash-lite-preview", LocalDate.of(2026, 5, 25)),
            Map.entry("gemini-2.5-flash-lite-preview-09-2025", LocalDate.of(2026, 3, 31)),
            Map.entry("gemini-2.0-flash", LocalDate.of(2026, 6, 1)),
            Map.entry("gemini-2.0-flash-001", LocalDate.of(2026, 6, 1)),
            Map.entry("gemini-2.0-flash-lite", LocalDate.of(2026, 6, 1)));

    private final ObjectMapper mapper;
    private final HttpClient http;
    private final String apiKey;
    private final Set<String> unavailableModels = new HashSet<>();
    private Map<String, String> listedModels;
    private long refreshAt;

    GeminiModelCatalog(ObjectMapper mapper, HttpClient http, String apiKey) {
        this.mapper = mapper;
        this.http = http;
        this.apiKey = apiKey;
    }

    synchronized List<ModelOption> options() {
        return models().entrySet().stream()
                .filter(entry -> !isRetired(entry.getKey()) && !unavailableModels.contains(entry.getKey()))
                .map(entry -> {
                    var date = SHUTDOWNS.get(entry.getKey());
                    return new ModelOption(entry.getKey(), entry.getValue(), ModelAvailability.AVAILABLE,
                            date == null ? null : date.toString());
                })
                .sorted(Comparator.comparing(ModelOption::id))
                .toList();
    }

    synchronized void requireAvailable(String model) {
        if (!isDesignModel(model)) throw new ConflictException("Choose a supported Gemini model");
        if (isRetired(model)) throw new ConflictException("This Gemini model has been retired. Choose another model");
        if (!models().containsKey(model) || unavailableModels.contains(model))
            throw new ConflictException("This Gemini model is unavailable. Choose another model");
    }

    synchronized void markUnavailable(String model) {
        if (listedModels != null && listedModels.containsKey(model))
            unavailableModels.add(model);
    }

    boolean isRetired(String model) {
        var date = SHUTDOWNS.get(model);
        return date != null && !LocalDate.now(ZoneOffset.UTC).isBefore(date);
    }

    private Map<String, String> models() {
        long now = System.nanoTime();
        if (listedModels == null || now - refreshAt >= 0) {
            listedModels = fetch();
            // A model rejected by generation stays hidden while its stale listing persists.
            unavailableModels.retainAll(listedModels.keySet());
            refreshAt = System.nanoTime() + CACHE_NANOS;
        }
        return listedModels;
    }

    private Map<String, String> fetch() {
        if (apiKey.isBlank()) throw new ConflictException("Gemini is not configured");
        var models = new LinkedHashMap<String, String>();
        String next = "";
        long deadline = System.nanoTime() + LOOKUP_NANOS;
        try {
            for (int page = 0; page < 10; page++) {
                long remaining = deadline - System.nanoTime();
                if (remaining <= 0) break;
                String url = MODELS_URL + "?pageSize=100";
                if (!next.isEmpty()) url += "&pageToken=" + URLEncoder.encode(next, StandardCharsets.UTF_8);
                var request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofNanos(remaining))
                        .header("x-goog-api-key", apiKey).GET().build();
                var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
                try (var body = response.body()) {
                    if (response.statusCode() != 200)
                        throw new ConflictException("Gemini model list is unavailable (HTTP " + response.statusCode() + ")");
                    byte[] bytes = body.readNBytes(MAX_RESPONSE_BYTES + 1);
                    if (bytes.length > MAX_RESPONSE_BYTES) break;
                    var data = mapper.readTree(bytes);
                    if (data == null || !data.isObject()) break;
                    for (var item : data.path("models")) {
                        String name = item.path("name").asText();
                        if (!name.startsWith("models/")) continue;
                        String id = name.substring("models/".length());
                        if (!isDesignModel(id)) continue;
                        for (var method : item.path("supportedGenerationMethods")) {
                            if ("generateContent".equals(method.asText())) {
                                String label = item.path("displayName").asText(id).strip();
                                models.put(id, label.isEmpty() || label.length() > 128 ? id : label);
                                break;
                            }
                        }
                    }
                    next = data.path("nextPageToken").asText();
                    if (next.isEmpty()) return models;
                    if (next.length() > 2048) break;
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ConflictException("Gemini model lookup was cancelled");
        } catch (IOException e) {
            throw new ConflictException("Could not load the Gemini model list. Try again");
        }
        throw new ConflictException("Gemini returned an incomplete model list. Try again");
    }

    private static boolean isDesignModel(String id) {
        return MODEL_ID.matcher(id).matches() && !SPECIALIZED.matcher(id).find();
    }
}
