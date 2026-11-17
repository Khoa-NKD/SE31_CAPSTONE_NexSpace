package base.api.feature.organizer.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class OrganizerContractPdfTest {
    @Test void embedsVietnameseFontAndPaginatesAnAgreement() throws Exception {
        String title = "HỢP ĐỒNG HỢP TÁC — Công ty TNHH Không Gian Sáng Tạo An Nhiên";
        byte[] pdf = new OrganizerContractPdf().render(title + "\n" + "Điều khoản hợp tác và trách nhiệm của các bên.\n".repeat(90));
        try (var document = org.apache.pdfbox.Loader.loadPDF(pdf)) {
            assertThat(document.getNumberOfPages()).isGreaterThanOrEqualTo(3);
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(document)).contains(title, "trách nhiệm");
            assertThat(document.getPage(0).getResources().getFont(document.getPage(0).getResources().getFontNames().iterator().next()).isEmbedded()).isTrue();
        }
    }
}
