package base.api.feature.workspace.dto.request;

import base.api.shared.enums.WorkspaceLifecycleAction;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WorkspaceLifecycleDto {

    @NotNull(message = "Hành động vòng đời không được để trống")
    private WorkspaceLifecycleAction action;

    @Size(max = 500, message = "Lý do tối đa 500 ký tự")
    private String reason;

    private Integer expectedVersion;
}
