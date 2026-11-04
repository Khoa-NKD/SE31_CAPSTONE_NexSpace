package base.api.feature.organizer.service;

import base.api.shared.exception.ForbiddenException;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class AdminOrganizerDocumentContentServiceTest {
    @Test void authorizesBeforeStorageAndSanitizesDownloadFilename() {
        var access = mock(AdminOrganizerDocumentAccessService.class);
        var storage = mock(PrivateOrganizerDocumentStorage.class);
        var service = new AdminOrganizerDocumentContentService(access, storage);
        byte[] bytes = "%PDF-1.4".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        when(access.authorize(1L, 7L, 9L)).thenReturn(new AdminOrganizerDocumentAccessService.Reference("internal-key", "C:\\private\\giấy phép\r\n.pdf"));
        when(storage.read("internal-key")).thenReturn(new PrivateOrganizerDocumentStorage.DocumentContent(bytes, "application/pdf"));
        var result = service.read(1L, 7L, 9L);
        assertThat(result.bytes()).isEqualTo(bytes); assertThat(result.contentType()).isEqualTo("application/pdf");
        assertThat(result.fileName()).isEqualTo("giấy phép__.pdf");
        var order = inOrder(access, storage); order.verify(access).authorize(1L, 7L, 9L); order.verify(storage).read("internal-key");
    }
    @Test void forbiddenAccessNeverReachesStorage() {
        var access = mock(AdminOrganizerDocumentAccessService.class); var storage = mock(PrivateOrganizerDocumentStorage.class);
        when(access.authorize(1L, 7L, 9L)).thenThrow(new ForbiddenException("Denied"));
        assertThatThrownBy(() -> new AdminOrganizerDocumentContentService(access, storage).read(1L, 7L, 9L)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(storage);
    }
}
