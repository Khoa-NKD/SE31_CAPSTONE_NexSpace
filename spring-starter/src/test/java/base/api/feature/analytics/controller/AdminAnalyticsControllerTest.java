package base.api.feature.analytics.controller;

import base.api.feature.analytics.dto.response.AdminDashboardOverviewResponseDTO;
import base.api.feature.analytics.dto.response.AdminOverviewKpiDTO;
import base.api.feature.analytics.dto.response.AdminPlatformAnalyticsResponseDTO;
import base.api.feature.analytics.service.IAdminAnalyticsService;
import base.api.shared.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminAnalyticsControllerTest {

    private MockMvc mockMvc;
    private IAdminAnalyticsService adminAnalyticsService;

    @BeforeEach
    void setUp() {
        adminAnalyticsService = mock(IAdminAnalyticsService.class);
        AdminAnalyticsController controller = new AdminAnalyticsController(adminAnalyticsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("GET /api/v1/admin/analytics/overview returns 200 with real overview payload")
    void testGetDashboardOverview() throws Exception {
        AdminDashboardOverviewResponseDTO mockResponse = AdminDashboardOverviewResponseDTO.builder()
                .timeframe("7 ngày qua")
                .kpis(List.of(
                        AdminOverviewKpiDTO.builder()
                                .id("kpi-users")
                                .label("Tổng người dùng")
                                .value("100")
                                .numericValue(100L)
                                .changePercent("+12%")
                                .changeType("positive")
                                .subtext("7 ngày qua")
                                .build()
                ))
                .triageItems(Collections.emptyList())
                .trendPoints(Collections.emptyList())
                .alerts(Collections.emptyList())
                .build();

        when(adminAnalyticsService.getDashboardOverview(eq("7d"))).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/admin/analytics/overview")
                        .param("timeRange", "7d")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.timeframe").value("7 ngày qua"))
                .andExpect(jsonPath("$.data.kpis[0].id").value("kpi-users"))
                .andExpect(jsonPath("$.data.kpis[0].value").value("100"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/analytics/platform returns 200 with platform analytics payload")
    void testGetPlatformAnalytics() throws Exception {
        AdminPlatformAnalyticsResponseDTO mockResponse = AdminPlatformAnalyticsResponseDTO.builder()
                .averageOccupancyPercent(78.5)
                .grossRevenueVnd(50000000L)
                .grossRevenueUsd(1964.6)
                .netRevenueVnd(5000000L)
                .netRevenueUsd(196.4)
                .totalBookings(60L)
                .activeWorkspacesCount(10L)
                .macroTrends(Collections.emptyList())
                .resourceBreakdown(Collections.emptyList())
                .leaderboard(Collections.emptyList())
                .build();

        when(adminAnalyticsService.getPlatformAnalytics(eq("30d"))).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/admin/analytics/platform")
                        .param("timeRange", "30d")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.averageOccupancyPercent").value(78.5))
                .andExpect(jsonPath("$.data.totalBookings").value(60));
    }
}
