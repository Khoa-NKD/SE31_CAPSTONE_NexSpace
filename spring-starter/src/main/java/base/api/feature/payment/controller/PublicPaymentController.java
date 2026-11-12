package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.ExchangeRateResponseDTO;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/public", "/api/public"})
@RequiredArgsConstructor
@Tag(name = "Public Payment & Currency", description = "Public currency quotes and exchange rate services")
public class PublicPaymentController extends BaseAPIController {

    private final IPaymentService paymentService;

    @GetMapping("/exchange-rate")
    @Operation(summary = "Lấy tỷ giá quy đổi USD <-> VNĐ phục vụ thanh toán PayOS")
    public ResponseEntity<ApiResponse<ExchangeRateResponseDTO>> getExchangeRate() {
        ExchangeRateResponseDTO response = paymentService.getExchangeRate();
        return success(response, "Lấy tỷ giá quy đổi thành công");
    }
}

