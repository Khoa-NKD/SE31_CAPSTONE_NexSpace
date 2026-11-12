package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.PaymentStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/organizer/workspaces/{workspaceId}/payments", "/api/organizer/workspaces/{workspaceId}/payments"})
@RequiredArgsConstructor
@Tag(name = "Organizer Payments", description = "Endpoints for Organizers to track payments and revenues across their workspaces")
public class OrganizerPaymentController extends BaseAPIController {

    private final IPaymentService paymentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Xem lịch sử thanh toán của không gian làm việc thuộc quyền quản lý")
    public ResponseEntity<ApiResponse<PageResponseDTO<PaymentTransactionResponseDTO>>> getWorkspacePaymentHistory(
            @PathVariable Long workspaceId,
            @RequestParam(required = false) PaymentStatus status,
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        Long actorId = getCurrentUserId();
        Page<PaymentTransactionResponseDTO> page = paymentService.getOrganizerPaymentHistory(workspaceId, actorId, status, pageRequest);
        return successPage(page);
    }
}

