package base.api.feature.workspace.dto.response;

import base.api.shared.enums.WorkspaceCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kết quả gợi ý tìm kiếm nhanh phân nhóm")
public class WorkspaceSuggestionsResponseDto {

    @Schema(description = "Danh sách không gian làm việc phù hợp nhất (tối đa 5)")
    private List<WorkspaceItemSuggestion> workspaces;

    @Schema(description = "Danh sách địa điểm / khu vực phù hợp nhất (tối đa 3)")
    private List<LocationSuggestion> locations;

    @Schema(description = "Danh sách loại hình không gian phù hợp (tối đa 3)")
    private List<CategorySuggestion> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkspaceItemSuggestion {
        private Long id;
        private String name;
        private String address;
        private String district;
        private String city;
        private WorkspaceCategory category;
        private String coverImageUrl;
        private BigDecimal pricePerHour;
        private Double rating;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationSuggestion {
        private String label;
        private String type; // "DISTRICT" or "CITY"
        private String city;
        private String district;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySuggestion {
        private WorkspaceCategory category;
        private String label;
        private String description;
    }
}

