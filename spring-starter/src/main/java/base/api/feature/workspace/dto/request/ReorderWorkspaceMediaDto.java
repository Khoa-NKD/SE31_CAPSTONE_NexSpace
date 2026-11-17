package base.api.feature.workspace.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReorderWorkspaceMediaDto {

    @NotEmpty(message = "Danh sách sắp xếp ảnh không được để trống")
    @Valid
    private List<ReorderMediaItemDto> items;
}

