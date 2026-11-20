package base.api.feature.payment.mapper;

import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.shared.entity.payment.OrganizerPayoutSettingModel;
import base.api.shared.entity.payment.OrganizerWithdrawalBatchModel;

public final class PayoutMapper {

    private PayoutMapper() {}

    public static OrganizerPayoutSettingDto toSettingDto(OrganizerPayoutSettingModel model) {
        if (model == null) return null;

        String orgName = model.getOrganizer() != null ? model.getOrganizer().getFullName() : null;
        Long orgId = model.getOrganizer() != null ? model.getOrganizer().getId() : null;
        Long reviewerId = model.getReviewedBy() != null ? model.getReviewedBy().getId() : null;

        return OrganizerPayoutSettingDto.builder()
                .id(model.getId())
                .organizerId(orgId)
                .organizerName(orgName)
                .payoutMode(model.getPayoutMode())
                .autoPayoutHour(model.getAutoPayoutHour())
                .approvalStatus(model.getApprovalStatus())
                .pendingAutoPayoutHour(model.getPendingAutoPayoutHour())
                .requestNote(model.getRequestNote())
                .adminFeedback(model.getAdminFeedback())
                .requestedAt(model.getRequestedAt())
                .reviewedAt(model.getReviewedAt())
                .reviewedBy(reviewerId)
                .build();
    }

    public static OrganizerWithdrawalBatchDto toWithdrawalBatchDto(OrganizerWithdrawalBatchModel model) {
        if (model == null) return null;

        String orgName = model.getOrganizer() != null ? model.getOrganizer().getFullName() : null;
        Long orgId = model.getOrganizer() != null ? model.getOrganizer().getId() : null;
        String rawAcc = model.getBankAccountNumber();
        String maskedAcc = maskAccountNumber(rawAcc);

        return OrganizerWithdrawalBatchDto.builder()
                .id(model.getId())
                .batchCode(model.getBatchCode())
                .organizerId(orgId)
                .organizerName(orgName)
                .amount(model.getAmount())
                .payoutType(model.getPayoutType())
                .status(model.getStatus())
                .bankName(model.getBankName())
                .bankBin(model.getBankBin())
                .bankAccountNumberMasked(maskedAcc)
                .bankAccountHolder(model.getBankAccountHolder())
                .payosReference(model.getPayosReference())
                .errorReason(model.getErrorReason())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    private static String maskAccountNumber(String acc) {
        if (acc == null || acc.length() < 4) return "••••";
        return "•••• " + acc.substring(acc.length() - 4);
    }
}
