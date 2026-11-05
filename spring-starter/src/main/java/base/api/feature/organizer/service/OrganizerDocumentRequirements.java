package base.api.feature.organizer.service;

import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.enums.*;
import java.util.*;

/** Approved NexSpace onboarding policy, shared by initial submissions and resubmissions. */
public final class OrganizerDocumentRequirements {
    private OrganizerDocumentRequirements() { }
    public record Requirement(OrganizerDocumentType documentType, String labelVi, String labelEn, String guidanceVi, String guidanceEn) { }
    public record Policy(BusinessType businessType, List<Requirement> requiredDocuments) { }

    public static List<OrganizerDocumentType> requiredTypes(BusinessType type) {
        if (type == BusinessType.SOLE_PROPRIETOR || type == BusinessType.HOUSEHOLD_BUSINESS)
            return List.of(OrganizerDocumentType.BUSINESS_LICENSE, OrganizerDocumentType.ID_CARD_FRONT, OrganizerDocumentType.ID_CARD_BACK);
        if (type == BusinessType.OTHER) return List.of(OrganizerDocumentType.BUSINESS_LICENSE, OrganizerDocumentType.OTHER);
        return List.of(OrganizerDocumentType.BUSINESS_LICENSE);
    }

    public static List<Policy> catalog() {
        return Arrays.stream(BusinessType.values()).map(type -> new Policy(type,
                requiredTypes(type).stream().map(document -> describe(type, document)).toList())).toList();
    }

    public static Map<String, String> errors(BusinessType type, List<OrganizerDocumentModel> current, boolean incomingLicense) {
        var errors = new LinkedHashMap<String, String>();
        for (var required : requiredTypes(type)) {
            boolean valid = current.stream().anyMatch(document -> document.getDocumentType() == required && usable(document));
            if (!(required == OrganizerDocumentType.BUSINESS_LICENSE && incomingLicense) && !valid)
                errors.put(required == OrganizerDocumentType.BUSINESS_LICENSE ? "businessLicense" : "documents." + required.name(),
                        "Upload a current, non-rejected document: " + describe(type, required).labelEn());
        }
        if (current.stream().anyMatch(document -> !usable(document))
                || current.stream().map(OrganizerDocumentModel::getDocumentType).distinct().count() != current.size())
            errors.put("documents", "Every current document must be valid, non-rejected and unique per type");
        return errors;
    }

    private static boolean usable(OrganizerDocumentModel document) {
        return document.isCurrent() && document.getFileUrl() != null && !document.getFileUrl().isBlank()
                && (document.getStatus() == OrganizerDocumentStatus.PENDING || document.getStatus() == OrganizerDocumentStatus.VERIFIED);
    }

    private static Requirement describe(BusinessType type, OrganizerDocumentType document) {
        return switch (document) {
            case BUSINESS_LICENSE -> type == BusinessType.HOUSEHOLD_BUSINESS
                    ? new Requirement(document, "Giấy chứng nhận đăng ký hộ kinh doanh", "Household business registration certificate",
                        "Bản đầy đủ, rõ tên hộ kinh doanh, mã đăng ký và chủ hộ.", "Include all pages showing the business name, registration identifier and owner.")
                    : type == BusinessType.OTHER
                    ? new Requirement(document, "Giấy thành lập hoặc đăng ký tương đương", "Establishment or equivalent registration document",
                        "Tài liệu thể hiện đơn vị được thành lập hợp lệ; OTHER không dùng để đăng ký cá nhân.", "Evidence of the organization's legal establishment. OTHER is not individual registration.")
                    : new Requirement(document, "Giấy chứng nhận đăng ký doanh nghiệp", "Enterprise registration certificate",
                        "Bản đầy đủ, rõ tên pháp lý, mã số doanh nghiệp và người đại diện/chủ doanh nghiệp.", "Include all pages showing the legal name, enterprise identifier and representative or proprietor.");
            case ID_CARD_FRONT -> new Requirement(document, "CCCD của chủ – mặt trước", "Owner identity card — front",
                    "CCCD của chủ doanh nghiệp tư nhân hoặc chủ hộ, còn hiệu lực và đọc rõ thông tin.", "A valid, readable identity card of the sole proprietor or household owner.");
            case ID_CARD_BACK -> new Requirement(document, "CCCD của chủ – mặt sau", "Owner identity card — back",
                    "Mặt sau của cùng CCCD đã nộp ở mặt trước.", "The reverse of the same identity card submitted as the front.");
            case OTHER -> new Requirement(document, "Bằng chứng tư cách đại diện đơn vị", "Evidence of authority to represent the organization",
                    "Ví dụ: quyết định bổ nhiệm hoặc văn bản ủy quyền; chưa yêu cầu giấy tờ của một workspace cụ thể.", "For example, an appointment or authorization document; this is not evidence for an individual workspace.");
            default -> throw new IllegalArgumentException("Unsupported required document type");
        };
    }
}
