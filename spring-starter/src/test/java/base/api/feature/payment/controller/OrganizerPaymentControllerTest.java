package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OrganizerPaymentControllerTest {

    private MockMvc mockMvc;
    private IPaymentService paymentService;
    private CurrentUserProvider currentUserProvider;

    @BeforeEach
    void setUp() {
        paymentService = mock(IPaymentService.class);
        currentUserProvider = mock(CurrentUserProvider.class);

        OrganizerPaymentController controller = new OrganizerPaymentController(paymentService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/organizer/workspaces/{workspaceId}/payments returns paginated transactions")
    void getWorkspacePaymentHistory_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(200L);

        PaymentTransactionResponseDTO tx = PaymentTransactionResponseDTO.builder()
                .orderCode(987654321L)
                .bookingId(10L)
                .bookingCode("NX-10-ORG")
                .amount(BigDecimal.valueOf(500000))
                .status(PaymentStatus.SUCCESS)
                .build();

        when(paymentService.getOrganizerPaymentHistory(eq(15L), eq(200L), any(), any(PageRequestDTO.class)))
                .thenReturn(new PageImpl<>(List.of(tx), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/organizer/workspaces/15/payments")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].orderCode").value(987654321))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(paymentService).getOrganizerPaymentHistory(eq(15L), eq(200L), any(), any(PageRequestDTO.class));
    }
}

