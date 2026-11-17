package base.api.feature.workspace.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WorkspaceOperatingHourDto {

    private String id;

    @NotNull(message = "Thứ trong tuần không được để trống (1 - 7)")
    @Min(value = 1, message = "Thứ trong tuần từ 1 (Thứ Hai) đến 7 (Chủ Nhật)")
    @Max(value = 7, message = "Thứ trong tuần từ 1 (Thứ Hai) đến 7 (Chủ Nhật)")
    private Integer dayOfWeek;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime openTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime closeTime;

    @JsonProperty("isClosed")
    @JsonAlias({"closed", "isClosed"})
    private boolean isClosed;

    @JsonProperty("is24Hours")
    @JsonAlias({"is24h", "is24Hours", "is247"})
    private boolean is24Hours;

    private boolean closesNextDay;

    public void setOpenTime(Object value) {
        this.openTime = parseLocalTime(value);
    }

    public void setCloseTime(Object value) {
        this.closeTime = parseLocalTime(value);
    }

    private static LocalTime parseLocalTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalTime lt) return lt;
        String str = value.toString().trim();
        if (str.isEmpty()) return null;
        if (str.length() == 5) {
            return LocalTime.parse(str, DateTimeFormatter.ofPattern("HH:mm"));
        }
        return LocalTime.parse(str);
    }
}
