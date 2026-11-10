package base.api.feature.workspace;

import base.api.feature.workspace.controller.PublicWorkspaceController;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.mapper.WorkspaceMapper;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.repository.WorkspaceDistanceProjection;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.feature.workspace.service.impl.WorkspaceServiceImpl;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Task 10: Map Geolocation & Proximity Distance Search Tests")
class WorkspaceProximityTest {

    private IWorkspaceRepository workspaceRepository;
    private IWorkspaceOperatingHourRepository operatingHourRepository;
    private IWorkspaceService workspaceService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(IWorkspaceRepository.class);
        operatingHourRepository = mock(IWorkspaceOperatingHourRepository.class);
        workspaceService = new WorkspaceServiceImpl(
                workspaceRepository,
                mock(base.api.feature.auth.repository.IUserRepository.class),
                operatingHourRepository,
                mock(base.api.feature.booking.repository.IBookingRepository.class)
        );

        PublicWorkspaceController controller = new PublicWorkspaceController(workspaceService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private WorkspaceModel createSampleWorkspace(Long id, String name, BigDecimal lat, BigDecimal lng) {
        UserModel organizer = new UserModel();
        organizer.setId(10L);
        organizer.setFirstName("Huy");
        organizer.setLastName("Dang");

        WorkspaceModel w = new WorkspaceModel();
        w.setId(id);
        w.setName(name);
        w.setOrganizer(organizer);
        w.setCategory(WorkspaceCategory.COWORKING_HUB);
        w.setAddress("72 Le Thanh Ton");
        w.setDistrict("District 1");
        w.setCity("Ho Chi Minh City");
        w.setLatitude(lat);
        w.setLongitude(lng);
        w.setAreaSqm(BigDecimal.valueOf(250.0));
        w.setStatus(WorkspaceStatus.ACTIVE);
        w.setBookingConfirmationMode(BookingConfirmationMode.INSTANT);
        w.setCreatedAt(LocalDateTime.now());
        w.setUpdatedAt(LocalDateTime.now());
        return w;
    }

    private WorkspaceDistanceProjection createProjection(Long id, Double distanceKm) {
        return new WorkspaceDistanceProjection() {
            @Override
            public Long getId() {
                return id;
            }

            @Override
            public Double getDistanceKm() {
                return distanceKm;
            }
        };
    }

    @Nested
    @DisplayName("Service Layer - Proximity & Geolocation Validations")
    class ServiceValidationTests {

        @Test
        @DisplayName("Should throw BadRequestException when latitude is null")
        void shouldThrowWhenLatIsNull() {
            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(null, 106.7009, 5.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("vĩ độ");
        }

        @Test
        @DisplayName("Should throw BadRequestException when latitude is out of bounds (< -90 or > 90)")
        void shouldThrowWhenLatIsOutOfBounds() {
            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(95.0, 106.7009, 5.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("[-90.0, 90.0]");

            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(-91.0, 106.7009, 5.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("[-90.0, 90.0]");
        }

        @Test
        @DisplayName("Should throw BadRequestException when longitude is null")
        void shouldThrowWhenLngIsNull() {
            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(10.7769, null, 5.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("kinh độ");
        }

        @Test
        @DisplayName("Should throw BadRequestException when longitude is out of bounds (< -180 or > 180)")
        void shouldThrowWhenLngIsOutOfBounds() {
            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(10.7769, 185.0, 5.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("[-180.0, 180.0]");

            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(10.7769, -181.0, 5.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("[-180.0, 180.0]");
        }

        @Test
        @DisplayName("Should throw BadRequestException when radius is less than 0.5 km or greater than 50.0 km")
        void shouldThrowWhenRadiusIsOutOfBounds() {
            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(10.7769, 106.7009, 0.2, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("0.5 km đến 50.0 km");

            assertThatThrownBy(() -> workspaceService.findNearbyWorkspaces(10.7769, 106.7009, 55.0, new PageRequestDTO()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("0.5 km đến 50.0 km");
        }

        @Test
        @DisplayName("Should return empty page when no workspaces are within radius")
        void shouldReturnEmptyPageWhenNoResults() {
            when(workspaceRepository.findNearbyWorkspaceIds(eq(10.7769), eq(106.7009), eq(5.0), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(Collections.emptyList()));

            Page<WorkspaceDto> result = workspaceService.findNearbyWorkspaces(10.7769, 106.7009, 5.0, new PageRequestDTO());
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }

        @Test
        @DisplayName("Should return workspaces sorted by distance with correctly formatted distanceKm")
        void shouldReturnNearbyWorkspacesWithDistance() {
            WorkspaceModel ws1 = createSampleWorkspace(1L, "Hub Ben Thanh", BigDecimal.valueOf(10.7725), BigDecimal.valueOf(106.6980));
            WorkspaceModel ws2 = createSampleWorkspace(2L, "Hub Landmark 81", BigDecimal.valueOf(10.7950), BigDecimal.valueOf(106.7219));

            WorkspaceDistanceProjection proj1 = createProjection(1L, 0.8543);
            WorkspaceDistanceProjection proj2 = createProjection(2L, 3.4211);

            when(workspaceRepository.findNearbyWorkspaceIds(eq(10.7769), eq(106.7009), eq(5.0), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(proj1, proj2)));

            when(workspaceRepository.findAllById(List.of(1L, 2L)))
                    .thenReturn(List.of(ws1, ws2));

            Page<WorkspaceDto> result = workspaceService.findNearbyWorkspaces(10.7769, 106.7009, 5.0, new PageRequestDTO());

            assertThat(result.getContent()).hasSize(2);
            assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
            assertThat(result.getContent().get(0).getName()).isEqualTo("Hub Ben Thanh");
            assertThat(result.getContent().get(0).getDistanceKm()).isEqualTo(0.85); // Rounded to 2 decimals

            assertThat(result.getContent().get(1).getId()).isEqualTo(2L);
            assertThat(result.getContent().get(1).getName()).isEqualTo("Hub Landmark 81");
            assertThat(result.getContent().get(1).getDistanceKm()).isEqualTo(3.42); // Rounded to 2 decimals
        }
    }

    @Nested
    @DisplayName("Controller Layer - /api/public/workspaces/nearby HTTP Contract")
    class ControllerHttpContractTests {

        @Test
        @DisplayName("GET /api/public/workspaces/nearby - Success with valid params returns 200 OK")
        void shouldReturn200ForValidNearbyRequest() throws Exception {
            WorkspaceModel ws1 = createSampleWorkspace(1L, "Saigon Prime Hub", BigDecimal.valueOf(10.7769), BigDecimal.valueOf(106.7009));
            WorkspaceDistanceProjection proj1 = createProjection(1L, 1.25);

            when(workspaceRepository.findNearbyWorkspaceIds(eq(10.7769), eq(106.7009), eq(5.0), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(proj1)));
            when(workspaceRepository.findAllById(List.of(1L)))
                    .thenReturn(List.of(ws1));

            mockMvc.perform(get("/api/public/workspaces/nearby")
                            .param("lat", "10.7769")
                            .param("lng", "106.7009")
                            .param("radiusKm", "5.0"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content[0].id").value(1))
                    .andExpect(jsonPath("$.data.content[0].name").value("Saigon Prime Hub"))
                    .andExpect(jsonPath("$.data.content[0].distanceKm").value(1.25))
                    .andExpect(jsonPath("$.data.totalElements").value(1));
        }

        @Test
        @DisplayName("GET /api/public/workspaces/nearby - Missing latitude returns 400 Bad Request")
        void shouldReturn400WhenLatMissing() throws Exception {
            mockMvc.perform(get("/api/public/workspaces/nearby")
                            .param("lng", "106.7009"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("GET /api/public/workspaces/nearby - Out of bounds coordinates returns 400 Bad Request")
        void shouldReturn400WhenLatOutOfBounds() throws Exception {
            mockMvc.perform(get("/api/public/workspaces/nearby")
                            .param("lat", "99.99")
                            .param("lng", "106.7009"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Tọa độ vĩ độ (lat) không hợp lệ, phải nằm trong khoảng [-90.0, 90.0]"));
        }

        @Test
        @DisplayName("GET /api/public/workspaces/nearby - Out of bounds radius returns 400 Bad Request")
        void shouldReturn400WhenRadiusOutOfBounds() throws Exception {
            mockMvc.perform(get("/api/public/workspaces/nearby")
                            .param("lat", "10.7769")
                            .param("lng", "106.7009")
                            .param("radiusKm", "100.0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Bán kính tìm kiếm (radiusKm) phải từ 0.5 km đến 50.0 km"));
        }
    }
}
