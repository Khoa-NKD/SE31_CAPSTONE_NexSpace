package base.api.feature.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO cập nhật ảnh đại diện thông qua đường dẫn mạng (JSON)")
public class UpdateAvatarDto {

    @Size(max = 1000, message = "Độ dài đường dẫn ảnh không vượt quá 1000 ký tự")
    @Schema(description = "Cách 1: Đường dẫn ảnh trên mạng (http:// hoặc https://)", example = "https://images.unsplash.com/photo-example.jpg")
    private String avatarUrl;

    @Size(max = 1000, message = "Độ dài đường dẫn ảnh không vượt quá 1000 ký tự")
    @Schema(description = "Tên trường thay thế cho avatarUrl")
    private String avatar;

    /**
     * Lấy URL ảnh đại diện hiệu lực từ avatarUrl hoặc avatar (bỏ qua giá trị mặc định 'string' của Swagger).
     */
    public String getEffectiveUrl() {
        if (avatarUrl != null && !avatarUrl.isBlank() && !avatarUrl.equalsIgnoreCase("string")) {
            return avatarUrl.trim();
        }
        if (avatar != null && !avatar.isBlank() && !avatar.equalsIgnoreCase("string")) {
            return avatar.trim();
        }
        return null;
    }
}
