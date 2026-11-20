package base.api.feature.organizer.service;

import base.api.feature.workspace.service.impl.CloudinaryStorageServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OrganizerContractFilesTest {
    @TempDir Path directory;

    @Test void anotherBackendCanReadTheSamePrivateCloudContractWithoutSharingALocalFolder() {
        var provider = mock(CloudinaryStorageServiceImpl.class);
        byte[] pdf = "%PDF-test".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        when(provider.isCloudinaryConfigured()).thenReturn(true);
        when(provider.uploadPrivateContract(eq(pdf), anyString())).thenAnswer(call ->
                CloudinaryStorageServiceImpl.PRIVATE_DOCUMENT_REFERENCE_PREFIX + "raw:Contracts/" + call.getArgument(1, String.class));
        var first = new OrganizerContractFiles(directory.resolve("machine-a").toString(), provider, true);
        String key = first.store(pdf);
        when(provider.readPrivateDocument(key)).thenReturn(pdf);
        var other = new OrganizerContractFiles(directory.resolve("machine-b").toString(), provider, true);

        assertThat(key.length()).isLessThanOrEqualTo(80);
        assertThat(other.read(key)).isEqualTo(pdf);
        assertThat(directory.resolve("machine-a")).doesNotExist();
        assertThat(directory.resolve("machine-b")).doesNotExist();
    }

    @Test void rollbackRemovesOnlyTheNewPrivateCloudArtifact() {
        var provider = mock(CloudinaryStorageServiceImpl.class);
        when(provider.isCloudinaryConfigured()).thenReturn(true);
        String key = CloudinaryStorageServiceImpl.PRIVATE_DOCUMENT_REFERENCE_PREFIX + "raw:Contracts/" + java.util.UUID.randomUUID() + ".pdf";
        when(provider.uploadPrivateContract(any(), anyString())).thenReturn(key);
        TransactionSynchronizationManager.initSynchronization();
        try {
            new OrganizerContractFiles(directory.toString(), provider, true).store(new byte[] {1});
            for (var synchronization : TransactionSynchronizationManager.getSynchronizations())
                synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            verify(provider).deletePrivateDocument(key);
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test void enabledCloudStorageCannotSilentlyFallBackToAMachineLocalFile() {
        var provider = mock(CloudinaryStorageServiceImpl.class);
        assertThatThrownBy(() -> new OrganizerContractFiles(directory.toString(), provider, true).store(new byte[] {1}))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("not configured");
        assertThat(directory.resolve("unexpected.pdf")).doesNotExist();
    }
}
