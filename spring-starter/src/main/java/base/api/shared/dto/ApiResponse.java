package base.api.shared.dto;

import java.time.Instant;
import lombok.*;
import org.slf4j.MDC;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
  private boolean success;
  private T data;
  private String message;
  @Builder.Default private Instant timestamp = Instant.now();
  @Builder.Default private String requestId = MDC.get("requestId");
}
