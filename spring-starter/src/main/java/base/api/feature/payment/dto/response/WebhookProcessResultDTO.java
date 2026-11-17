package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class WebhookProcessResultDTO {
    Long orderCode;
    String status; // SUCCESS, FAILED, ALREADY_PROCESSED, IGNORED
    String message;
}

