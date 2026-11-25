package base.api.feature.booking.service;

import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Resolves customer-selected extras from authoritative workspace rates. */
@Service
@RequiredArgsConstructor
public class BookingAddons {
    private final IWorkspaceAmenityRepository amenities;

    public List<Item> quote(Long workspaceId, List<Long> requested, LocalDateTime start, LocalDateTime end) {
        if (requested == null || requested.isEmpty()) return List.of();
        var available = amenities.findAllByWorkspaceId(workspaceId);
        BigDecimal seconds = BigDecimal.valueOf(Duration.between(start, end).toSeconds());
        return requested.stream().distinct().map(id -> {
            var row = available.stream().filter(a -> a.getAmenity().getId().equals(id) && a.getAmenity().isActive())
                    .findFirst().orElseThrow(() -> new BadRequestException("Tiện ích không còn khả dụng trong không gian."));
            var rate = row.getAddonPricePerHour();
            if (rate == null || rate.signum() <= 0) throw new BadRequestException("Tiện ích miễn phí đã được bao gồm trong đặt chỗ.");
            return new Item(id, row.getAmenity().getName(), rate,
                    rate.multiply(seconds).divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP));
        }).toList();
    }

    public record Item(Long amenityId, String name, BigDecimal hourlyRate, BigDecimal amount) {}
}
