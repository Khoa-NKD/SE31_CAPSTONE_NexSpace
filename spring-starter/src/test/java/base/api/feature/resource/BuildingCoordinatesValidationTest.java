package base.api.feature.resource;

import static org.assertj.core.api.Assertions.assertThat;
import base.api.feature.resource.dto.BuildingRequests;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class BuildingCoordinatesValidationTest {
    @Test
    void rejectsPartialOrOutOfRangePinsWhileKeepingLegacyRequestsValid() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertThat(validator.validate(new BuildingRequests.Building("Building", "Address", null))).isEmpty();
            assertThat(validator.validate(new BuildingRequests.Building("Building", "Address", null,
                    BigDecimal.ZERO, null))).isNotEmpty();
            assertThat(validator.validate(new BuildingRequests.Building("Building", "Address", null,
                    new BigDecimal("90.01"), new BigDecimal("181")))).isNotEmpty();
            assertThat(validator.validate(new BuildingRequests.Building("Building", "Address", null,
                    new BigDecimal("16.05440000"), new BigDecimal("108.20220000")))).isEmpty();
        }
    }
}
