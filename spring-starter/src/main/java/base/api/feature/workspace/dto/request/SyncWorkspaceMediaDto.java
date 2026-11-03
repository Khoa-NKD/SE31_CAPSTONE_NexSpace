package base.api.feature.workspace.dto.request;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncWorkspaceMediaDto {

    @Valid
    private List<AddWorkspaceMediaDto> items;
}

