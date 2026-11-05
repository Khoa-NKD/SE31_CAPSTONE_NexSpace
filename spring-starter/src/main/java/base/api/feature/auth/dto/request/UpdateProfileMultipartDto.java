package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserGender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

/**
 * DTO phục vụ cập nhật hồ sơ cá nhân qua FormData/Multipart,
 * hỗ trợ 2 cách đăng tải avatar:
 *  - Cách 1: Nhập link ảnh trên mạng qua trường avatar (http:// hoặc https://)
 *  - Cách 2: Đính kèm file ảnh từ máy tính qua trường file (ảnh local)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileMultipartDto {

    @NotBlank(message = "Tên không được để trống")
    @Size(min = 1, max = 50, message = "Độ dài tên không hợp lệ (1-50 ký tự)")
    @Pattern(regexp = "^[\\p{L}\\p{M}\\s'-]+$", message = "Tên chỉ được chứa ký tự chữ cái và khoảng trắng")
    private String firstName;

    @Size(max = 50, message = "Độ dài họ đệm không hợp lệ (tối đa 50 ký tự)")
    @Pattern(regexp = "^[\\p{L}\\p{M}\\s'-]*$", message = "Họ đệm chỉ được chứa ký tự chữ cái và khoảng trắng")
    private String lastName;

    @Pattern(
            regexp = "^(|(0|\\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7})$",
            message = "Số điện thoại không hợp lệ (yêu cầu định dạng 10 chữ số)"
    )
    private String phone;

    @Past(message = "Ngày sinh phải là ngày trong quá khứ")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate birthDate;

    private UserGender gender;

    /**
     * Cách 1: Dùng link ảnh trên mạng (http:// hoặc https://).
     */
    @Size(max = 1000, message = "Độ dài đường dẫn ảnh đại diện không hợp lệ (tối đa 1000 ký tự)")
    @Pattern(
            regexp = "^(https?://.*)?$",
            message = "Đường dẫn ảnh đại diện không đúng định dạng URL"
    )
    private String avatar;

    /**
     * Cách 2: Tải lên file ảnh từ máy tính (ảnh local).
     */
    private MultipartFile file;
}

