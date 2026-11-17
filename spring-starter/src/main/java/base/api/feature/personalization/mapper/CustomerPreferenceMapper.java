package base.api.feature.personalization.mapper;

import base.api.feature.personalization.dto.response.CustomerPreferenceDto;
import base.api.shared.entity.personalization.CustomerPreferenceModel;
import base.api.shared.enums.ResourceCategoryPreference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.List;

@Slf4j
public final class CustomerPreferenceMapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private CustomerPreferenceMapper() {
    }

    public static CustomerPreferenceDto toDto(CustomerPreferenceModel model) {
        if (model == null) {
            return null;
        }
        return CustomerPreferenceDto.builder()
                .customerId(model.getCustomerId())
                .districts(deserializeStringList(model.getDistrictsJson()))
                .amenityIds(deserializeLongList(model.getAmenityIdsJson()))
                .budgetMin(model.getBudgetMin())
                .budgetMax(model.getBudgetMax())
                .resourceCategory(model.getResourceCategory() != null ? model.getResourceCategory() : ResourceCategoryPreference.ANY)
                .noiseLevel(model.getNoiseLevel())
                .purpose(model.getPurpose())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    public static CustomerPreferenceDto toEmptyDto(Long customerId) {
        return CustomerPreferenceDto.builder()
                .customerId(customerId)
                .districts(Collections.emptyList())
                .amenityIds(Collections.emptyList())
                .budgetMin(null)
                .budgetMax(null)
                .resourceCategory(ResourceCategoryPreference.ANY)
                .noiseLevel(null)
                .purpose(null)
                .updatedAt(null)
                .build();
    }

    public static String serializeList(List<?> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.error("Lỗi khi chuyển đổi danh sách sang JSON", e);
            return "[]";
        }
    }

    public static List<String> deserializeStringList(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            return Collections.emptyList();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Lỗi khi giải tuần tự hóa districts JSON: {}", json, e);
            return Collections.emptyList();
        }
    }

    public static List<Long> deserializeLongList(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            return Collections.emptyList();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<Long>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Lỗi khi giải tuần tự hóa amenityIds JSON: {}", json, e);
            return Collections.emptyList();
        }
    }
}

