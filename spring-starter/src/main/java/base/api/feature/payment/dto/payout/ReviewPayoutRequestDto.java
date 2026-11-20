package base.api.feature.payment.dto.payout;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewPayoutRequestDto {

    @NotNull(message = "Vui lòng chọn quyết định phê duyệt (true/false)")
    private Boolean approved;

    @Size(max = 500, message = "Ghi chú phản hồi không được vượt quá 500 ký tự")
    private String adminFeedback;
}
