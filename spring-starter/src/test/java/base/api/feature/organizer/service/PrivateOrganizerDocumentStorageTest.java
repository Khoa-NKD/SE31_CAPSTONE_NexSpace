package base.api.feature.organizer.service;

import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.*;

class PrivateOrganizerDocumentStorageTest {
    @TempDir Path directory;

    @ParameterizedTest
    @ValueSource(strings = {"../license.pdf", "C:\\license.pdf", "license\n.pdf", "bad:name.pdf", ""})
    void rejectsUnsafeNames(String name) throws Exception {
        var file = new MockMultipartFile("businessLicense", name, "application/pdf", OrganizerApplicationServiceTest.license().getBytes());
        assertThatThrownBy(() -> new PrivateOrganizerDocumentStorage(directory.toString()).store(file))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsEmptyOversizedAndSpoofedFiles() {
        var storage = new PrivateOrganizerDocumentStorage(directory.toString());
        assertThatThrownBy(() -> storage.store(new MockMultipartFile("file", "license.pdf", "application/pdf", new byte[0])))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> storage.store(new MockMultipartFile("file", "license.pdf", "application/pdf", new byte[(int) PrivateOrganizerDocumentStorage.MAX_BYTES + 1])))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> storage.store(new MockMultipartFile("file", "license.pdf", "application/pdf", "not a PDF".getBytes())))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> storage.store(new MockMultipartFile("file", "license.pdf", "image/png", OrganizerApplicationServiceTest.license().getBytes())))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void acceptsSizeBoundaryAndGeneratesUniquePrivateKeys() throws Exception {
        var storage = new PrivateOrganizerDocumentStorage(directory.toString());
        byte[] bytes = new byte[(int) PrivateOrganizerDocumentStorage.MAX_BYTES];
        System.arraycopy(OrganizerApplicationServiceTest.license().getBytes(), 0, bytes, 0, OrganizerApplicationServiceTest.license().getBytes().length);
        var first = storage.store(new MockMultipartFile("file", "license.pdf", "application/pdf", bytes));
        var second = storage.store(OrganizerApplicationServiceTest.license());
        assertThat(first.key()).isNotEqualTo(second.key()).matches("[a-f0-9-]+\\.pdf");
        assertThat(Files.size(directory.resolve(first.key()))).isEqualTo(PrivateOrganizerDocumentStorage.MAX_BYTES);
        storage.delete(first);
        assertThat(directory.resolve(first.key())).doesNotExist();
        assertThat(directory.resolve(second.key())).exists();
    }

    @Test
    void requiresConfiguredAbsoluteStorageOutsideSource() {
        assertThatThrownBy(() -> new PrivateOrganizerDocumentStorage("").store(OrganizerApplicationServiceTest.license()))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new PrivateOrganizerDocumentStorage("relative-directory").store(OrganizerApplicationServiceTest.license()))
                .isInstanceOf(IllegalStateException.class);
    }
}
