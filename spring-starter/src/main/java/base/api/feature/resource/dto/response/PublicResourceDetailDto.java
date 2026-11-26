package base.api.feature.resource.dto.response;

import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategory;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class PublicResourceDetailDto {
    Long id;
    String code;
    String name;
    ResourceCategory category;
    Integer capacity;
    BigDecimal pricePerHour;
    String zoneName;
    NoiseLevel noiseLevel;
    Long typeId;
    String typeName;
    String typeDescription;
    List<String> photos;
    Long floorPlanId;
    String floorName;
    Integer floorNumber;
    BigDecimal posX;
    BigDecimal posY;
    BigDecimal width;
    BigDecimal height;
    BigDecimal posXM;
    BigDecimal posYM;
}
