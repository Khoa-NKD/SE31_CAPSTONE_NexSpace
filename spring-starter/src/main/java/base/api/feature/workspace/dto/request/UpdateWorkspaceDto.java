package base.api.feature.workspace.dto.request;

import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceCategory;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateWorkspaceDto {

    @Size(max = 255, message = "Tên không gian tối đa 255 ký tự")
    private String name;

    private WorkspaceCategory category;

    private String description;

    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    @JsonAlias({"streetAddress", "address"})
    private String address;

    @Size(max = 100, message = "Quận / Huyện tối đa 100 ký tự")
    private String district;

    @Size(max = 100, message = "Tỉnh / Thành phố tối đa 100 ký tự")
    private String city;

    private BigDecimal latitude;

    private BigDecimal longitude;

    @JsonAlias({"usableAreaSqm", "areaSqm", "totalArea"})
    private BigDecimal areaSqm;

    @Size(max = 20, message = "Số điện thoại hỗ trợ tối đa 20 ký tự")
    @JsonAlias({"contactPhone", "supportPhone"})
    private String supportPhone;

    @Size(max = 1000, message = "Hướng dẫn vào cửa tối đa 1000 ký tự")
    @JsonAlias({"entryNotes", "entryInstructions"})
    private String entryInstructions;

    private BookingConfirmationMode bookingConfirmationMode;
}
