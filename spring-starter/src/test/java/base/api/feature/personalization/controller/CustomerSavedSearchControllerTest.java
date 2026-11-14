package base.api.feature.personalization.controller;

import base.api.feature.personalization.dto.request.CreateSavedSearchFilterDto;
import base.api.feature.personalization.dto.request.SavedSearchFilterCriteriaDto;
import base.api.feature.personalization.dto.response.SavedSearchFilterDto;
import base.api.feature.personalization.service.ISavedSearchFilterService;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CustomerSavedSearchControllerTest {

    private MockMvc mockMvc;
    private ISavedSearchFilterService savedSearchFilterService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        savedSearchFilterService = mock(ISavedSearchFilterService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        CustomerSavedSearchController controller = new CustomerSavedSearchController(savedSearchFilterService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
    }

    @Test
    @DisplayName("GET /api/customer/saved-searches - Trả về HTTP 200 và danh sách bộ lọc")
    void getMySavedFilters_Success() throws Exception {
        SavedSearchFilterDto dto = SavedSearchFilterDto.builder()
                .id(1L)
                .name("Phòng họp giá tốt")
                .criteria(SavedSearchFilterCriteriaDto.builder().city("Hồ Chí Minh").build())
                .createdAt(LocalDateTime.now())
                .build();

        when(savedSearchFilterService.getMySavedFilters(10L)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/customer/saved-searches")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data[0].id").value(1L))
                .andExpect(jsonPath("$.data[0].name").value("Phòng họp giá tốt"));

        verify(savedSearchFilterService).getMySavedFilters(10L);
    }

    @Test
    @DisplayName("POST /api/customer/saved-searches - Trả về HTTP 201 khi lưu thành công")
    void createSavedFilter_Success() throws Exception {
        SavedSearchFilterCriteriaDto criteria = SavedSearchFilterCriteriaDto.builder()
                .city("Hồ Chí Minh")
                .district("Quận 1")
                .minPrice(BigDecimal.valueOf(50000))
                .build();

        CreateSavedSearchFilterDto request = CreateSavedSearchFilterDto.builder()
                .name("Khu vực Q1")
                .criteria(criteria)
                .build();

        SavedSearchFilterDto response = SavedSearchFilterDto.builder()
                .id(2L)
                .name("Khu vực Q1")
                .criteria(criteria)
                .build();

        when(savedSearchFilterService.createSavedFilter(eq(10L), any(CreateSavedSearchFilterDto.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/customer/saved-searches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.name").value("Khu vực Q1"));

        verify(savedSearchFilterService).createSavedFilter(eq(10L), any(CreateSavedSearchFilterDto.class));
    }

    @Test
    @DisplayName("POST /api/customer/saved-searches - Trả về HTTP 400 khi tên bộ lọc trống")
    void createSavedFilter_BadRequest_WhenNameEmpty() throws Exception {
        CreateSavedSearchFilterDto request = CreateSavedSearchFilterDto.builder()
                .name("")
                .criteria(new SavedSearchFilterCriteriaDto())
                .build();

        mockMvc.perform(post("/api/customer/saved-searches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /api/customer/saved-searches/{id} - Trả về HTTP 200 khi xóa thành công")
    void deleteSavedFilter_Success() throws Exception {
        doNothing().when(savedSearchFilterService).deleteSavedFilter(10L, 5L);

        mockMvc.perform(delete("/api/customer/saved-searches/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200));

        verify(savedSearchFilterService).deleteSavedFilter(10L, 5L);
    }
}
