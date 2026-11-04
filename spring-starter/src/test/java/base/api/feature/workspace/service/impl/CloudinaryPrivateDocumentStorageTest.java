package base.api.feature.workspace.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CloudinaryPrivateDocumentStorageTest {
    private static final String KEY = "12345678-1234-4234-8234-123456789abc";
    private CloudinaryStorageServiceImpl storage;
    private Uploader uploader;

    @BeforeEach
    void setUp() throws Exception {
        storage = spy(new CloudinaryStorageServiceImpl());
        ReflectionTestUtils.setField(storage, "cloudName", "fixture-cloud");
        ReflectionTestUtils.setField(storage, "apiKey", "fixture-api-key");
        ReflectionTestUtils.setField(storage, "apiSecret", "fixture-api-secret");
        var cloudinary = mock(Cloudinary.class);
        uploader = mock(Uploader.class);
        doReturn(cloudinary).when(storage).createCloudinaryClient();
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenAnswer(invocation -> {
            Map<?, ?> options = invocation.getArgument(1);
            assertThat(options.get("type")).isEqualTo("authenticated");
            assertThat(options.get("overwrite")).isEqualTo(false);
            assertThat(options.get("use_filename")).isEqualTo(false);
            assertThat(options.containsKey("upload_preset")).isFalse();
            assertThat(options.containsKey("eager")).isFalse();
            return Map.of("public_id", options.get("public_id"), "resource_type", options.get("resource_type"),
                    "type", "authenticated", "secure_url", "https://cdn.example.test/never-return-this-url");
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"jpg", "jpeg", "png", "pdf"})
    void explicitlyProtectsEachSupportedResourceTypeAndReturnsOnlyAReference(String extension) throws Exception {
        byte[] bytes = "Synthetic validated bytes".getBytes();
        String resourceType = extension.equals("pdf") ? "raw" : "image";
        String publicId = "nexspace/organizer-verification/" + KEY + (extension.equals("pdf") ? ".pdf" : "");
        String reference = storage.uploadPrivateDocument(bytes, KEY + "." + extension);
        assertThat(reference).isEqualTo("cloudinary:authenticated:" + resourceType + ":" + publicId)
                .doesNotContain("http", "signature", "fixture-api-secret");
        verify(uploader).upload(same(bytes), argThat(options -> resourceType.equals(options.get("resource_type"))
                && publicId.equals(options.get("public_id"))));
    }

    @Test
    void rejectsPublicDeliveryAndCompensatesOnlyTheNewGeneratedAsset() throws Exception {
        doAnswer(invocation -> {
            Map<?, ?> options = invocation.getArgument(1);
            return Map.of("public_id", options.get("public_id"), "resource_type", "raw", "type", "upload");
        }).when(uploader).upload(any(), anyMap());
        assertThatThrownBy(() -> storage.uploadPrivateDocument(new byte[]{1}, KEY + ".pdf"))
                .hasMessage("Could not store verification document").hasNoCause();
        verify(uploader).destroy(eq("nexspace/organizer-verification/" + KEY + ".pdf"),
                argThat(options -> "raw".equals(options.get("resource_type")) && "upload".equals(options.get("type"))));
    }

    @Test
    void unexpectedForeignIdIsNeverAcceptedOrDeleted() throws Exception {
        doReturn(Map.of("public_id", "unrelated-existing-id", "resource_type", "raw", "type", "authenticated"))
                .when(uploader).upload(any(), anyMap());
        assertThatThrownBy(() -> storage.uploadPrivateDocument(new byte[]{1}, KEY + ".pdf"))
                .hasMessage("Could not store verification document");
        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @Test
    void existingAssetResponseIsNeverAdoptedOrDeleted() throws Exception {
        doAnswer(invocation -> {
            Map<?, ?> options = invocation.getArgument(1);
            return Map.of("public_id", options.get("public_id"), "resource_type", "raw", "type", "authenticated", "existing", true);
        }).when(uploader).upload(any(), anyMap());
        assertThatThrownBy(() -> storage.uploadPrivateDocument(new byte[]{1}, KEY + ".pdf"))
                .hasMessage("Could not store verification document");
        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @Test
    void providerErrorDetailsAreNotPropagatedOrUsedForPublicFallback() throws Exception {
        doThrow(new IOException("provider detail: signed-url-and-secret")).when(uploader).upload(any(), anyMap());
        assertThatThrownBy(() -> storage.uploadPrivateDocument(new byte[]{1}, KEY + ".pdf"))
                .isInstanceOf(IllegalStateException.class).hasMessage("Could not store verification document").hasNoCause();
        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @ParameterizedTest
    @ValueSource(strings = {"image", "raw"})
    void cleanupUsesTheRecordedAuthenticatedResourceType(String type) throws Exception {
        when(uploader.destroy(anyString(), anyMap())).thenReturn(Map.of("result", "ok"));
        String publicId = "nexspace/organizer-verification/" + KEY + (type.equals("raw") ? ".pdf" : "");
        storage.deletePrivateDocument("cloudinary:authenticated:" + type + ":" + publicId);
        verify(uploader).destroy(eq(publicId), argThat(options -> "authenticated".equals(options.get("type"))
                && type.equals(options.get("resource_type")) && Boolean.TRUE.equals(options.get("invalidate"))));
    }

    @Test
    void invalidReferencesAndUnavailableCredentialsNeverInvokeDestroy() throws Exception {
        for (String reference : new String[]{"https://cdn.example.test/file", "cloudinary:authenticated:raw:other/" + KEY + ".pdf", "cloudinary:upload:image:anything"}) {
            assertThatThrownBy(() -> storage.deletePrivateDocument(reference)).isInstanceOf(IllegalStateException.class);
        }
        ReflectionTestUtils.setField(storage, "apiSecret", "");
        assertThatThrownBy(() -> storage.uploadPrivateDocument(new byte[]{1}, KEY + ".pdf")).isInstanceOf(IllegalStateException.class);
        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @Test
    void cleanupFailureIsSanitizedAndNotSilentlyIgnored() throws Exception {
        when(uploader.destroy(anyString(), anyMap())).thenThrow(new IOException("private signed URL"));
        assertThatThrownBy(() -> storage.deletePrivateDocument("cloudinary:authenticated:raw:nexspace/organizer-verification/" + KEY + ".pdf"))
                .hasMessage("Could not clean up verification document").hasNoCause();
    }
}
