package base.api.feature.personalization.dto.response;

import base.api.feature.personalization.dto.request.SavedSearchFilterCriteriaDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedSearchFilterDto {

    private Long id;
    private String name;
    private SavedSearchFilterCriteriaDto criteria;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

