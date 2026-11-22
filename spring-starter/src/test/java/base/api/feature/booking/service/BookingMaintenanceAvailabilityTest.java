package base.api.feature.booking.service;

import base.api.feature.booking.service.impl.BookingServiceImpl;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.ResourceUsageRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingMaintenanceAvailabilityTest {
    @Mock IBookableResourceRepository resourceRepository;
    @Mock IWorkspaceRepository workspaceRepository;
    @Mock ResourceUsageRepository resourceUsageRepository;
    @Mock IPlatformSettingRepository platformSettingRepository;
    @InjectMocks BookingServiceImpl service;
    BookableResourceModel room, desk;
    LocalDateTime start;

    @BeforeEach void setup() {
        var workspace = new WorkspaceModel();workspace.setId(1L);
        var floor = new FloorPlanModel();floor.setId(11L);floor.setWorkspace(workspace);
        var roomType = new ResourceTypeModel();roomType.setCategory(ResourceCategory.ROOM);roomType.setCapacity(10);roomType.setActive(true);
        var deskType = new ResourceTypeModel();deskType.setCategory(ResourceCategory.DESK);deskType.setCapacity(1);deskType.setActive(true);
        room = new BookableResourceModel();room.setId(21L);room.setFloorPlan(floor);room.setResourceType(roomType);room.setStatus(BookableResourceStatus.ACTIVE);
        desk = new BookableResourceModel();desk.setId(22L);desk.setFloorPlan(floor);desk.setResourceType(deskType);desk.setParentRoom(room);desk.setStatus(BookableResourceStatus.ACTIVE);
        when(resourceRepository.findByFloorPlanId(11L)).thenReturn(List.of(room, desk));
        start = LocalDateTime.now().plusDays(1);
    }

    @Test void customerRoomStaysSelectableWithReducedCapacityAndChildIsMaintained() {
        when(resourceUsageRepository.occupancy(eq(11L), any(), any(), any()))
                .thenReturn(Map.of(desk.getId(), Set.of(AvailabilityState.MAINTENANCE)));
        var result = service.getFloorAvailability(1L, 11L, start, start.plusHours(1));
        assertThat(result.get(0).getCapacity()).isEqualTo(9);
        assertThat(result.get(0).isSelectable()).isTrue();
        assertThat(result.get(1).getState()).isEqualTo(AvailabilityState.MAINTENANCE);
        assertThat(result.get(1).isSelectable()).isFalse();
        assertThat(room.getStatus()).isEqualTo(BookableResourceStatus.ACTIVE);
    }

    @Test void customerMapReceivesMaintenanceForRoomAndAllItsSeats() {
        when(resourceUsageRepository.occupancy(eq(11L), any(), any(), any()))
                .thenReturn(Map.of(room.getId(), Set.of(AvailabilityState.MAINTENANCE)));
        var result = service.getFloorAvailability(1L, 11L, start, start.plusHours(1));
        assertThat(result).allSatisfy(item -> {
            assertThat(item.getState()).isEqualTo(AvailabilityState.MAINTENANCE);
            assertThat(item.isSelectable()).isFalse();
            assertThat(item.getCapacity()).isZero();
        });
    }

    @Test void childReservationStillPreventsRoomBooking() {
        when(resourceUsageRepository.occupancy(eq(11L), any(), any(), any()))
                .thenReturn(Map.of(desk.getId(), Set.of(AvailabilityState.BOOKED)));
        var result = service.getFloorAvailability(1L, 11L, start, start.plusHours(1));
        assertThat(result.get(0).getState()).isEqualTo(AvailabilityState.BOOKED);
        assertThat(result.get(0).isSelectable()).isFalse();
    }

    @Test void publishedDraftRoomAndSeatsKeepMaintenanceSignalsWhileNewDraftsStayPrivate() {
        for (var item : List.of(room, desk)) {
            item.setPosX(java.math.BigDecimal.ZERO); item.setPosY(java.math.BigDecimal.ZERO);
            item.setWidth(java.math.BigDecimal.TEN); item.setHeight(java.math.BigDecimal.TEN);
            item.setRotation(java.math.BigDecimal.ZERO);
        }
        room.getFloorPlan().setPublishedGeometryJson(
                base.api.feature.resource.service.PublishedGeometry.snapshot(List.of(room, desk)));
        room.setStatus(BookableResourceStatus.DRAFT); desk.setStatus(BookableResourceStatus.DRAFT);
        when(resourceUsageRepository.occupancy(eq(11L), any(), any(), any()))
                .thenReturn(Map.of(room.getId(), Set.of(AvailabilityState.MAINTENANCE)));
        var result = service.getFloorAvailability(1L, 11L, start, start.plusHours(1));
        assertThat(result).hasSize(2).allSatisfy(item -> {
            assertThat(item.getState()).isEqualTo(AvailabilityState.MAINTENANCE);
            assertThat(item.isSelectable()).isFalse();
        });
        room.getFloorPlan().setPublishedGeometryJson("[]");
        assertThat(service.getFloorAvailability(1L, 11L, start, start.plusHours(1))).isEmpty();
    }
}
