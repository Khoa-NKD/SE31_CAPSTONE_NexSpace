package base.api.feature.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConfirmWebhookRequestDTO {

    @NotBlank(message = "Webhook URL không được để trống")
    private String webhookUrl;
}

