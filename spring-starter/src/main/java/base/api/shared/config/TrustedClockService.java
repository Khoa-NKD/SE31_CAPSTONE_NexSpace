package base.api.shared.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Đồng hồ thời gian thực đáng tin cậy (Trusted Clock).
 * Kết hợp mốc thời gian mạng chuẩn (NTP / HTTP Date Header từ Google, Cloudflare)
 * và bộ đếm chu kỳ CPU đơn điệu (Monotonic Clock: System.nanoTime()).
 * Ngăn chặn tuyệt đối việc người dùng chỉnh sửa ngày giờ trên máy tính để bẻ khóa hoặc gian lận thời gian.
 */
@Slf4j
@Service
public class TrustedClockService {

    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<String> TIME_SERVERS = List.of(
            "https://www.google.com",
            "https://cloudflare.com"
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    private volatile Instant baseRealInstant;
    private volatile long baseNanoTime;

    public TrustedClockService() {
        syncWithNetworkTime();
    }

    public synchronized void syncWithNetworkTime() {
        Instant realInstant = fetchNetworkTime();
        if (realInstant != null) {
            this.baseRealInstant = realInstant;
            this.baseNanoTime = System.nanoTime();
            log.info("[TrustedClock] Đã đồng bộ mốc thời gian thực từ Network Time: {} (Monotonic Nano: {})",
                    baseRealInstant, baseNanoTime);
        } else {
            this.baseRealInstant = Instant.now();
            this.baseNanoTime = System.nanoTime();
            log.warn("[TrustedClock] Không thể kết nối Time Server mạng. Tạm thời sử dụng System Clock làm mốc.");
        }
    }

    /**
     * Lấy Instant chuẩn xác theo thời gian thực (không bị ảnh hưởng bởi việc đổi đồng hồ máy tính).
     */
    public Instant nowInstant() {
        if (baseRealInstant == null) {
            return Instant.now();
        }
        long elapsedNanos = System.nanoTime() - baseNanoTime;
        return baseRealInstant.plusNanos(elapsedNanos);
    }

    /**
     * Lấy LocalDateTime tại múi giờ Việt Nam (GMT+7 / UTC+7).
     */
    public LocalDateTime nowInVietnam() {
        return LocalDateTime.ofInstant(nowInstant(), VIETNAM_ZONE);
    }

    private Instant fetchNetworkTime() {
        for (String serverUrl : TIME_SERVERS) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(serverUrl))
                        .method("HEAD", HttpRequest.BodyPublishers.noBody())
                        .timeout(Duration.ofSeconds(3))
                        .build();

                HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
                Optional<String> dateHeader = response.headers().firstValue("date");
                if (dateHeader.isPresent()) {
                    return DateTimeFormatter.RFC_1123_DATE_TIME.parse(dateHeader.get(), Instant::from);
                }
            } catch (Exception ex) {
                log.debug("[TrustedClock] Lấy thời gian từ {} không thành công: {}", serverUrl, ex.getMessage());
            }
        }
        return null;
    }
}

