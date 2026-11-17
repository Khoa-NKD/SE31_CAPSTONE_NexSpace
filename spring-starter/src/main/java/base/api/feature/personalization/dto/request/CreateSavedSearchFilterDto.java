package base.api.feature.personalization.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSavedSearchFilterDto {

    @NotBlank(message = "Tên bộ lọc không được để trống")
    @Size(max = 100, message = "Tên bộ lọc không được vượt quá 100 ký tự")
    private String name;

    @NotNull(message = "Tiêu chí tìm kiếm không được để trống")
    @Valid
    private SavedSearchFilterCriteriaDto criteria;
}

