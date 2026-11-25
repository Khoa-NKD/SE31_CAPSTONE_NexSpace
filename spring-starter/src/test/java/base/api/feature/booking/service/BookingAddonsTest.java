package base.api.feature.booking.service;

import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.shared.entity.workspace.WorkspaceAmenityModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingAddonsTest {
    private final IWorkspaceAmenityRepository repository = mock(IWorkspaceAmenityRepository.class);
    private final BookingAddons service = new BookingAddons(repository);
    private final LocalDateTime start = LocalDateTime.parse("2030-01-01T09:00");
    private WorkspaceAmenityModel amenity(String rate) {
        var amenity = new AmenityModel(); amenity.setId(4L); amenity.setName("Projector"); amenity.setActive(true);
        var row = new WorkspaceAmenityModel(); row.setAmenity(amenity); row.setAddonPricePerHour(new BigDecimal(rate)); return row;
    }
    @Test void chargesOnlySelectedExtrasForActualDurationAndDeduplicates() {
        when(repository.findAllByWorkspaceId(1L)).thenReturn(List.of(amenity("12000")));
        var items = service.quote(1L,List.of(4L,4L),start,start.plusMinutes(90));
        assertThat(items).hasSize(1);
        assertThat(items.get(0).amount()).isEqualByComparingTo("18000.00");
        assertThat(service.quote(1L,List.of(),start,start.plusDays(1))).isEmpty();
    }
    @Test void rejectsForeignInactiveAndComplimentarySelections() {
        when(repository.findAllByWorkspaceId(1L)).thenReturn(List.of(amenity("0")));
        assertThatThrownBy(() -> service.quote(1L,List.of(4L),start,start.plusHours(1))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.quote(1L,List.of(9L),start,start.plusHours(1))).isInstanceOf(BadRequestException.class);
        var row = amenity("12000"); row.getAmenity().setActive(false);
        when(repository.findAllByWorkspaceId(1L)).thenReturn(List.of(row));
        assertThatThrownBy(() -> service.quote(1L,List.of(4L),start,start.plusHours(1))).isInstanceOf(BadRequestException.class);
    }
}
