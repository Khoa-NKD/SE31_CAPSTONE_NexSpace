package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.ExchangeRateResponseDTO;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicPaymentControllerTest {

    private MockMvc mockMvc;
    private IPaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = mock(IPaymentService.class);
        PublicPaymentController controller = new PublicPaymentController(paymentService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/public/exchange-rate returns exchange rate quote")
    void getExchangeRate_success() throws Exception {
        ExchangeRateResponseDTO quote = ExchangeRateResponseDTO.builder()
                .baseCurrency("USD")
                .targetCurrency("VND")
                .exchangeRate(BigDecimal.valueOf(25450))
                .updatedAt(LocalDateTime.now())
                .build();

        when(paymentService.getExchangeRate()).thenReturn(quote);

        mockMvc.perform(get("/api/public/exchange-rate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.baseCurrency").value("USD"))
                .andExpect(jsonPath("$.data.targetCurrency").value("VND"))
                .andExpect(jsonPath("$.data.exchangeRate").value(25450));

        verify(paymentService).getExchangeRate();
    }
}

