package base.api.feature.organizer.service;

import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PrivateOrganizerDocumentStorageFailureTest {
    @TempDir Path directory;

    private MockMultipartFile pdf(String name) {
        return new MockMultipartFile("file", name, "application/pdf",
                "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF".getBytes(StandardCharsets.US_ASCII));
    }

    @Test
    void storageFailureDoesNotOverwriteAnExistingFile() throws Exception {
        Path existing = directory.resolve("existing-file");
        Files.writeString(existing, "Existing content", StandardCharsets.UTF_8);
        var storage = new PrivateOrganizerDocumentStorage(existing.toString());

        assertThatThrownBy(() -> storage.store(pdf("license.pdf")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Could not store verification document");
        assertThat(Files.readString(existing)).isEqualTo("Existing content");
        try (var files = Files.list(directory)) {
            assertThat(files.toList()).containsExactly(existing);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"license\r\n.pdf", "license\u0000.pdf", "..\\license.pdf", "license.pdf.exe", "license.html"})
    void rejectsFilenameInjectionAndUnsupportedExtensionsBeforeWriting(String name) throws Exception {
        var storage = new PrivateOrganizerDocumentStorage(directory.toString());
        assertThatThrownBy(() -> storage.store(pdf(name))).isInstanceOf(BadRequestException.class);
        try (var files = Files.list(directory)) {
            assertThat(files).isEmpty();
        }
    }

    @Test
    void rejectsExecutableContentDisguisedAsPdfBeforeWriting() throws Exception {
        var storage = new PrivateOrganizerDocumentStorage(directory.toString());
        var file = new MockMultipartFile("file", "license.pdf", "application/pdf",
                "MZ executable content".getBytes(StandardCharsets.US_ASCII));
        assertThatThrownBy(() -> storage.store(file)).isInstanceOf(BadRequestException.class);
        try (var files = Files.list(directory)) {
            assertThat(files).isEmpty();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"uploads", "src/main/resources/static", "src/main/resources/public",
            "src/main/resources/resources", "src/main/resources/META-INF/resources", "target/classes/static",
            "target/classes/public", "target/classes/resources", "target/classes/META-INF/resources"})
    void rejectsPublicStorageConfigurationBeforeCreatingDirectories(String publicRoot) {
        Path target = Path.of(publicRoot).toAbsolutePath().resolve("verification-storage-must-not-be-created");
        var storage = new PrivateOrganizerDocumentStorage(target.toString());
        assertThatThrownBy(() -> storage.store(pdf("evidence.pdf")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Verification documents must be stored outside public resource directories");
        assertThat(target).doesNotExist();
    }
}
