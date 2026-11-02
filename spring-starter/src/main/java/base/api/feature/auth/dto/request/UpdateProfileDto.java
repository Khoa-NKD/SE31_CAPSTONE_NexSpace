package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserGender;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileDto {
    @NotBlank(message = "Họ không được để trống")
    private String firstName;

    private String lastName;

    @Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$", message = "Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)")
    private String phone;

    @Size(max = 255)
    private String avatar;

    @Past(message = "Ngày sinh phải là ngày trong quá khứ")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    private UserGender gender;
}
