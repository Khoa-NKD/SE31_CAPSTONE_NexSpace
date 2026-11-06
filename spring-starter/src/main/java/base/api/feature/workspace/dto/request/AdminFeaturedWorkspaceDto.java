package base.api.feature.workspace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminFeaturedWorkspaceDto {

    @NotNull(message = "Cờ nổi bật không được để trống")
    private Boolean isFeatured;

    private Integer featuredOrder;

    private LocalDateTime featuredUntil;
}

