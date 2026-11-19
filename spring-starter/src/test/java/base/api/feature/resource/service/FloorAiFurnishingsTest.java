package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDecorations;
import base.api.feature.resource.dto.FloorDesign;
import base.api.shared.enums.ResourceUsageKind;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class FloorAiFurnishingsTest {
    @ParameterizedTest
    @ValueSource(strings = {"Desk 1", "Sofa seat", "Ghế làm việc", "Chair 2"})
    void preservesBookableSeats(String name) {
        var normalized = FloorAiFurnishings.normalize(proposal(name));

        assertThat(normalized.resources()).singleElement()
                .satisfies(resource -> assertThat(resource.name()).isEqualTo(name));
        assertThat(normalized.decorations()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bàn làm việc", "Table 1"})
    void convertsPhysicalTablesToDecorations(String name) {
        var normalized = FloorAiFurnishings.normalize(proposal(name));

        assertThat(normalized.resources()).isEmpty();
        assertThat(normalized.decorations()).singleElement().satisfies(item -> {
            assertThat(item.label()).isEqualTo(name);
            assertThat(item.icon()).isEqualTo(FloorDecorations.Icon.TABLE);
            assertThat(item.width()).isEqualByComparingTo("60");
        });
    }

    private FloorDesign.Design proposal(String name) {
        var resource = new FloorDesign.ResourceChange("new_item", null, 1L, name, null, 1,
                BigDecimal.TEN, BigDecimal.TEN, new BigDecimal("60"), new BigDecimal("40"),
                BigDecimal.ZERO, ResourceUsageKind.WORK_SEAT);
        return new FloorDesign.Design("Draft", null, List.of(resource), List.of(), List.of(), List.of());
    }
}
