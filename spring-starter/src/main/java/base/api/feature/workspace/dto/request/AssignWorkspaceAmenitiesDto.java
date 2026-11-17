package base.api.feature.workspace.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignWorkspaceAmenitiesDto {

    @NotNull(message = "Danh sách tiện ích không được null")
    @Valid
    @Builder.Default
    private List<AssignAmenityItemDto> amenities = new ArrayList<>();
}

