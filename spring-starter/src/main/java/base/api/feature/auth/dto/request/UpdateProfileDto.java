package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserGender;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileDto {

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
    @JsonFormat(pattern = "yyyy-MM-dd", shape = JsonFormat.Shape.STRING)
    private LocalDate birthDate;

    private UserGender gender;

    @Size(max = 1000, message = "Độ dài đường dẫn ảnh đại diện không hợp lệ (tối đa 1000 ký tự)")
    @Pattern(
            regexp = "^(https?://.*)?$",
            message = "Đường dẫn ảnh đại diện không đúng định dạng URL"
    )
    private String avatar;
}
