package base.api.feature.booking.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BookingAddonRequest(@NotNull @Size(max = 100) List<@NotNull @Positive Long> amenityIds) {}
