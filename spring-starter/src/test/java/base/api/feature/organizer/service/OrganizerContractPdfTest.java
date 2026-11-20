package base.api.feature.organizer.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class OrganizerContractPdfTest {
    @Test void embedsVietnameseFontAndPaginatesAnAgreement() throws Exception {
        String title = "HỢP ĐỒNG HỢP TÁC — Công ty TNHH Không Gian Sáng Tạo An Nhiên";
        byte[] pdf = new OrganizerContractPdf().render(title + "\n" + "Điều khoản hợp tác và trách nhiệm của các bên.\n".repeat(90));
        try (var document = org.apache.pdfbox.Loader.loadPDF(pdf)) {
            assertThat(document.getNumberOfPages()).isGreaterThanOrEqualTo(3);
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(document).replaceAll("\\s+", " "))
                    .contains(title, "trách nhiệm");
            assertThat(document.getPage(0).getResources().getFont(document.getPage(0).getResources().getFontNames().iterator().next()).isEmbedded()).isTrue();
        }
    }

    @Test void configuredAgreementIncludesBothPartiesApprovalAndOtpEvidenceWithoutClipping() throws Exception {
        var environment = new org.springframework.mock.env.MockEnvironment()
                .withProperty("app.organizer.contract.platform.legal-name", "305 NEXSPACE")
                .withProperty("app.organizer.contract.platform.tax-id", "TEST-TAX-ID")
                .withProperty("app.organizer.contract.platform.address", "Ngũ Hành Sơn, Đà Nẵng, Việt Nam")
                .withProperty("app.organizer.contract.platform.representative-name", "Nguyễn Huy Vũ")
                .withProperty("app.organizer.contract.platform.representative-title", "CEO");
        var reviewer = new base.api.shared.entity.UserModel(); reviewer.setId(1L); reviewer.setUserName("reviewer-test");
        reviewer.setFirstName("Người"); reviewer.setLastName("Duyệt");
        var profile = new base.api.shared.entity.organizer.OrganizerProfileModel();
        profile.setLegalName("Công ty Không Gian Mẫu"); profile.setRepresentativeName("Người Ký Mẫu");
        profile.setAddress("Địa chỉ kiểm thử"); profile.setTaxId("TEST-ORGANIZER-TAX-ID");
        profile.setReviewedBy(reviewer); profile.setReviewedAt(java.time.LocalDateTime.parse("2026-11-20T01:00:00"));
        String text = OrganizerContractTemplate.render(profile, "NX-ORG-TEST", profile.getReviewedAt(), environment, java.math.BigDecimal.TEN)
                + "\nBIÊN NHẬN XÁC NHẬN ĐIỆN TỬ\nĐại diện Organizer: Người Ký Mẫu\nPhương thức: OTP email\nSHA-256: " + "a".repeat(64);
        byte[] bytes = new OrganizerContractPdf().render(text);
        var output = java.nio.file.Path.of("target", "contract-preview");
        java.nio.file.Files.createDirectories(output);
        java.nio.file.Files.write(output.resolve("agreement-example.pdf"), bytes);
        try (var document = org.apache.pdfbox.Loader.loadPDF(bytes)) {
            String extracted = new org.apache.pdfbox.text.PDFTextStripper().getText(document).replaceAll("\\s+", " ");
            assertThat(extracted).contains("305 NEXSPACE", "Nguyễn Huy Vũ", "Người Ký Mẫu", "reviewer-test", "10%", "OTP email", "SHA-256");
            assertThat(extracted).contains("Trang 1 / " + document.getNumberOfPages());
            var renderer = new org.apache.pdfbox.rendering.PDFRenderer(document);
            for (int i = 0; i < document.getNumberOfPages(); i++)
                javax.imageio.ImageIO.write(renderer.renderImageWithDPI(i, 110), "png", output.resolve("page-" + (i + 1) + ".png").toFile());
        }
    }
}
