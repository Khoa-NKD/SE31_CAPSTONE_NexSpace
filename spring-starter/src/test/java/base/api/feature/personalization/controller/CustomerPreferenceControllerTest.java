package base.api.feature.personalization.controller;

import base.api.feature.personalization.dto.request.UpdateCustomerPreferenceDto;
import base.api.feature.personalization.dto.response.CustomerPreferenceDto;
import base.api.feature.personalization.service.ICustomerPreferenceService;
import base.api.shared.enums.BookingPurpose;
import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategoryPreference;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ForbiddenException;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CustomerPreferenceControllerTest {

    private MockMvc mockMvc;
    private ICustomerPreferenceService customerPreferenceService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        customerPreferenceService = mock(ICustomerPreferenceService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        CustomerPreferenceController controller = new CustomerPreferenceController(customerPreferenceService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        // Giả lập user đăng nhập mặc định có ID = 10L
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
    }

    @Test
    @DisplayName("GET /api/customer-preferences/me - Trả về HTTP 200 và thông tin sở thích thành công")
    void getMyPreferences_Success() throws Exception {
        CustomerPreferenceDto dto = CustomerPreferenceDto.builder()
                .customerId(10L)
                .districts(List.of("Hải Châu", "Sơn Trà"))
                .amenityIds(List.of(1L, 2L))
                .budgetMin(BigDecimal.valueOf(50000))
                .budgetMax(BigDecimal.valueOf(150000))
                .resourceCategory(ResourceCategoryPreference.DESK)
                .noiseLevel(NoiseLevel.QUIET)
                .purpose(BookingPurpose.FREELANCE)
                .build();

        when(customerPreferenceService.getMyPreferences(10L)).thenReturn(dto);

        mockMvc.perform(get("/api/customer-preferences/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.customerId").value(10))
                .andExpect(jsonPath("$.data.districts[0]").value("Hải Châu"))
                .andExpect(jsonPath("$.data.districts[1]").value("Sơn Trà"))
                .andExpect(jsonPath("$.data.amenityIds[0]").value(1))
                .andExpect(jsonPath("$.data.resourceCategory").value("DESK"));

        verify(customerPreferenceService).getMyPreferences(10L);
    }

    @Test
    @DisplayName("GET /api/customer-preferences/me - Trả về HTTP 403 Forbidden khi role không phải USER")
    void getMyPreferences_Forbidden() throws Exception {
        when(customerPreferenceService.getMyPreferences(10L))
                .thenThrow(new ForbiddenException("Chức năng thiết lập sở thích chỉ áp dụng cho tài khoản Khách hàng (Customer)"));

        mockMvc.perform(get("/api/customer-preferences/me"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(403))
                .andExpect(jsonPath("$.message").value("Chức năng thiết lập sở thích chỉ áp dụng cho tài khoản Khách hàng (Customer)"));
    }

    @Test
    @DisplayName("POST /api/customer-preferences/me - Thiết lập thành công trả về HTTP 201 Created")
    void createMyPreferences_Success() throws Exception {
        UpdateCustomerPreferenceDto request = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .amenityIds(List.of(1L))
                .budgetMin(BigDecimal.valueOf(50000))
                .budgetMax(BigDecimal.valueOf(100000))
                .resourceCategory(ResourceCategoryPreference.ROOM)
                .purpose(BookingPurpose.FREELANCE)
                .build();

        CustomerPreferenceDto responseDto = CustomerPreferenceDto.builder()
                .customerId(10L)
                .districts(List.of("Hải Châu"))
                .amenityIds(List.of(1L))
                .budgetMin(BigDecimal.valueOf(50000))
                .budgetMax(BigDecimal.valueOf(100000))
                .resourceCategory(ResourceCategoryPreference.ROOM)
                .purpose(BookingPurpose.FREELANCE)
                .build();

        when(customerPreferenceService.createMyPreferences(eq(10L), any(UpdateCustomerPreferenceDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/customer-preferences/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.data.resourceCategory").value("ROOM"));

        verify(customerPreferenceService).createMyPreferences(eq(10L), any(UpdateCustomerPreferenceDto.class));
    }

    @Test
    @DisplayName("PUT /api/customer-preferences/me - Cập nhật thành công trả về HTTP 200")
    void updateMyPreferences_Success() throws Exception {
        UpdateCustomerPreferenceDto request = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .amenityIds(List.of(1L))
                .budgetMin(BigDecimal.valueOf(50000))
                .budgetMax(BigDecimal.valueOf(100000))
                .resourceCategory(ResourceCategoryPreference.ROOM)
                .build();

        CustomerPreferenceDto responseDto = CustomerPreferenceDto.builder()
                .customerId(10L)
                .districts(List.of("Hải Châu"))
                .amenityIds(List.of(1L))
                .budgetMin(BigDecimal.valueOf(50000))
                .budgetMax(BigDecimal.valueOf(100000))
                .resourceCategory(ResourceCategoryPreference.ROOM)
                .build();

        when(customerPreferenceService.updateMyPreferences(eq(10L), any(UpdateCustomerPreferenceDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(put("/api/customer-preferences/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.resourceCategory").value("ROOM"));

        verify(customerPreferenceService).updateMyPreferences(eq(10L), any(UpdateCustomerPreferenceDto.class));
    }

    @Test
    @DisplayName("PUT /api/customer-preferences/me - Trả về HTTP 400 khi service ném BadRequestException")
    void updateMyPreferences_BadRequest() throws Exception {
        UpdateCustomerPreferenceDto request = UpdateCustomerPreferenceDto.builder()
                .districts(List.of("Hải Châu"))
                .budgetMin(BigDecimal.valueOf(200000))
                .budgetMax(BigDecimal.valueOf(100000))
                .build();

        when(customerPreferenceService.updateMyPreferences(eq(10L), any(UpdateCustomerPreferenceDto.class)))
                .thenThrow(new BadRequestException("Ngân sách tối thiểu không được lớn hơn ngân sách tối đa"));

        mockMvc.perform(put("/api/customer-preferences/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.message").value("Ngân sách tối thiểu không được lớn hơn ngân sách tối đa"));
    }

    @Test
    @DisplayName("DELETE /api/customer-preferences/me - Xóa thành công trả về HTTP 200")
    void deleteMyPreferences_Success() throws Exception {
        doNothing().when(customerPreferenceService).deleteMyPreferences(10L);

        mockMvc.perform(delete("/api/customer-preferences/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").value("Xóa sở thích không gian thành công"));

        verify(customerPreferenceService).deleteMyPreferences(10L);
    }
}

