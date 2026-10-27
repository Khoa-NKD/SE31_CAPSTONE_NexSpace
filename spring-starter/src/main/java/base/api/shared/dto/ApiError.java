package base.api.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;
import lombok.*;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {
  @Builder.Default private boolean success = false;
  private int status;
  private String error;
  private String message;
  private String path;
  @Builder.Default private Instant timestamp = Instant.now();
  @Builder.Default private String requestId = MDC.get("requestId");
  private Map<String, String> validationErrors;

  public static ApiError of(
      HttpStatus status, String message, String path, Map<String, String> errors) {
    return ApiError.builder()
        .status(status.value())
        .error(status.getReasonPhrase())
        .message(message)
        .path(path)
        .validationErrors(errors)
        .build();
  }
}
