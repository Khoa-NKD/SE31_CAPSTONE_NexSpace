package base.api.feature.organizer.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.exception.BadRequestException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class OrganizerIdentityImageCheckTest {
    @TempDir Path directory;

    @Test void distinguishesLowResolutionFromCorruptFilesBeforeInvokingOcr() throws Exception {
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.verify(OrganizerDocumentType.ID_CARD_FRONT,
                png(100, 300), "missing-ocr", ""))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("resolution is too low");
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.verify(OrganizerDocumentType.ID_CARD_FRONT,
                new byte[] {1, 2, 3}, "missing-ocr", ""))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("could not be opened");
    }

    @Test void missingExecutableAndLanguagePacksAreServerErrorsRatherThanPhotoErrors() throws Exception {
        byte[] image = png(220, 300);
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.verify(OrganizerDocumentType.ID_CARD_FRONT,
                image, directory.resolve("not-installed").toString(), ""))
                .isInstanceOf(OrganizerIdentityCheckUnavailableException.class).hasMessageContaining("not configured");
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.verify(OrganizerDocumentType.ID_CARD_FRONT,
                image, "missing-ocr", directory.toString()))
                .isInstanceOf(OrganizerIdentityCheckUnavailableException.class).hasMessageContaining("missing required language data");
    }

    @Test void diagnosticDetailsNeverReachTheUserAndUnreadableTextDoesNotClaimProvenBlur() {
        var error = OrganizerIdentityImageCheck.processFailure("Error opening data file /private/path/vie.traineddata");
        assertThat(error.getMessage()).contains("language data").doesNotContain("/private/path");
        assertThat(OrganizerIdentityImageCheck.processFailure("private provider output").getMessage())
                .contains("failed to process").doesNotContain("private provider output");
        assertThat(OrganizerIdentityImageCheck.unreadable("").getMessage()).contains("No readable text");
        assertThat(OrganizerIdentityImageCheck.unreadable("partly recognized text").getMessage())
                .contains("may be blurred", "all four corners");
    }

    private byte[] png(int width, int height) throws Exception {
        var output = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(width, height,
                java.awt.image.BufferedImage.TYPE_INT_RGB), "png", output);
        return output.toByteArray();
    }

    @Test void verifiedPairStorageSkipsRepeatedOcrButPublicUploadStillRequiresIt() throws Exception {
        var storage = new PrivateOrganizerDocumentStorage(directory.resolve("private").toString());
        var file = new org.springframework.mock.web.MockMultipartFile("file", "front.png", "image/png", png(220, 300));
        var stored = storage.storeVerifiedIdentity(file, 1L, OrganizerDocumentType.ID_CARD_FRONT);
        assertThat(java.nio.file.Files.readAllBytes(directory.resolve("private").resolve(stored.key()))).isEqualTo(file.getBytes());
        assertThatThrownBy(() -> storage.store(file, 1L, OrganizerDocumentType.ID_CARD_FRONT))
                .isInstanceOf(OrganizerIdentityCheckUnavailableException.class);
        assertThatThrownBy(() -> storage.storeVerifiedIdentity(new org.springframework.mock.web.MockMultipartFile("file", "bad.png", "image/png", new byte[]{1,2}), 1L, OrganizerDocumentType.ID_CARD_BACK))
                .isInstanceOf(BadRequestException.class);
    }
    @ParameterizedTest
    @CsvSource({
            "'CĂN CƯỚC | Họ, chữ đệm và tên | Ngày sinh', 1",
            "'IDENTITY CARD | Full name | Date of birth', 1",
            "'Ngày cấp | BỘ CÔNG AN | Nơi đăng ký khai sinh', 2",
            "'1D VN M 123456789012 <<<<<<<<<<', 2",
            "'ID VNM 123456789012', 0",
            "'Biên nhận thanh toán | Tổng tiền', 0"
    })
    void classifiesRecognizedFields(String text, int expectedSide) {
        assertThat(OrganizerIdentityImageCheck.classify(text)).isEqualTo(expectedSide);
    }

    @Test void comparesOnlyUniqueReadableNumbersAndNeverExposesThemInErrors() {
        String number = "012345678901";
        assertThat(OrganizerIdentityImageCheck.identityNumber("Số: 012 345 678 901\nNgày sinh: 01/01/1990", 1)).isEqualTo(number);
        assertThat(OrganizerIdentityImageCheck.identityNumber("1D VN M 345678901 3 012345678901 << 0", 2)).isEqualTo(number);
        assertThat(OrganizerIdentityImageCheck.identityNumber("Ngày cấp 01/01/2020", 2)).isNull();
        assertThat(OrganizerIdentityImageCheck.identityNumber("012345678901\n112345678901", 1)).isNull();
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM0123456789O15<<<<", 2)).isNull();
        assertThatCode(() -> OrganizerIdentityImageCheck.requireSameNumber(number, number)).doesNotThrowAnyException();
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.requireSameNumber(number, "112345678901"))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("different identity numbers")
                .hasMessageNotContaining(number).hasMessageNotContaining("112345678901");
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.requireSameNumber(number, null))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Could not compare");
    }

    @Test void readsFullNidFromOptionalMrzFieldInsteadOfDocumentNumberAndChecksum() {
        String front = "012345678901";
        String back = OrganizerIdentityImageCheck.identityNumber("IDVNM3456789013012345678901<<0", 2);
        assertThat(back).isEqualTo(front).isNotEqualTo("345678901301");
        assertThatCode(() -> OrganizerIdentityImageCheck.requireSameNumber(front, back)).doesNotThrowAnyException();
        // The document number can be independent of the full personal number.
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM0960134616001099012345<<2", 2))
                .isEqualTo("001099012345");
    }

    @Test void doesNotAcceptAnotherPersonsBackEvenWithTheSameDocumentNumber() {
        String back = OrganizerIdentityImageCheck.identityNumber("IDVNM3456789013112345678901<<0", 2);
        assertThat(back).isEqualTo("112345678901");
        assertThatThrownBy(() -> OrganizerIdentityImageCheck.requireSameNumber("012345678901", back))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("different identity numbers")
                .hasMessageNotContaining("012345678901").hasMessageNotContaining(back);
    }

    @Test void rejectsBadChecksumAmbiguityTruncationAndGuessedDigits() {
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM3456789019012345678901<<0", 2)).isNull();
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM3456789013012345678901", 2)).isNull();
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM34567890130123456789O1<<0", 2)).isNull();
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM3456789013012345678901<<0\nIDVNM3456789013112345678901<<0", 2)).isNull();
        assertThat(OrganizerIdentityImageCheck.identityNumber("IDVNM3456789013012345678901<<0\nIDVNM3456789013012345678901<<0", 2))
                .isEqualTo("012345678901");
    }
}
