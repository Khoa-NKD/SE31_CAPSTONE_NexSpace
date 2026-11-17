package base.api.feature.organizer.service;

import base.api.feature.workspace.service.impl.CloudinaryStorageServiceImpl;
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class PrivateOrganizerDocumentDeliveryTest {
    static class FakeCloudinary extends CloudinaryStorageServiceImpl {
        URI requested;
        @Override public boolean isCloudinaryConfigured() { return true; }
        @Override protected Cloudinary createCloudinaryClient() {
            return new Cloudinary(Map.of("cloud_name","fixture-cloud","api_key","fixture-key","api_secret","fixture-not-a-real-secret","secure",true));
        }
        @Override protected byte[] downloadPrivateDocument(URI uri) { requested=uri; return "%PDF-1.4".getBytes(java.nio.charset.StandardCharsets.US_ASCII); }
    }
    @Test void authenticatesImageAndRawDeliveryOnFixedHttpsHostWithoutNetwork() {
        var provider=new FakeCloudinary();
        for (String value: new String[]{"image:nexspace/organizer-verification/11111111-1111-1111-1111-111111111111", "raw:nexspace/organizer-verification/11111111-1111-1111-1111-111111111111.pdf"}) {
            var storage=new PrivateOrganizerDocumentStorage("",provider,false);
            assertThat(storage.read("cloudinary:authenticated:"+value).contentType()).isEqualTo("application/pdf");
            boolean raw = value.startsWith("raw:");
            assertThat(provider.requested.getHost()).isEqualTo(raw ? "api.cloudinary.com" : "res.cloudinary.com");
            assertThat(provider.requested.getScheme()).isEqualTo("https");
            if (raw) {
                assertThat(provider.requested.getPath()).contains("/raw/download");
                assertThat(provider.requested.getQuery()).contains("signature=", "expires_at=", "type=authenticated");
            } else assertThat(provider.requested.getPath()).contains("/authenticated/s--");
        }
        // Reading dispatches by the persisted reference even when new Cloudinary uploads are disabled.
        assertThatThrownBy(() -> provider.readPrivateDocument("cloudinary:authenticated:image:../../foreign"))
                .isInstanceOf(PrivateDocumentUnavailableException.class);
    }
    @Test void sanitizesUnexpectedProviderFailures() {
        var provider=new FakeCloudinary() { @Override protected byte[] downloadPrivateDocument(URI uri) { throw new IllegalStateException("private-provider-details"); } };
        assertThatThrownBy(() -> provider.readPrivateDocument("cloudinary:authenticated:raw:nexspace/organizer-verification/11111111-1111-1111-1111-111111111111.pdf"))
                .isInstanceOf(PrivateDocumentUnavailableException.class).hasMessageNotContaining("private-provider-details").hasNoCause();
    }
}
