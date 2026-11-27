package base.api.feature.organizer.service;

import base.api.feature.organizer.repository.IOrganizerContractRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerContractModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.exception.ConflictException;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.env.PropertiesPropertySourceLoader;
import org.springframework.core.env.Profiles;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrganizerContractLocalDefaultsTest {
    /** Load only the tracked defaults; never depend on a developer's local secrets or database. */
    private MockEnvironment defaults(String... profiles) throws IOException {
        var environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        for (var resource : new String[] {"application.properties", "organizer-local-defaults.properties"}) {
            for (var source : new PropertiesPropertySourceLoader().load(resource, new ClassPathResource(resource))) {
                var activation = source.getProperty("spring.config.activate.on-profile");
                if (activation == null || environment.acceptsProfiles(Profiles.of(activation.toString()))) {
                    environment.getPropertySources().addFirst(source);
                }
            }
        }
        return environment;
    }

    @Test void aFreshLocalCheckoutCanGenerateAndStoreItsBundledAgreement(@TempDir Path directory) throws Exception {
        var environment = defaults("local");
        assertThat(environment.getProperty("app.organizer.contract.demo-enabled", Boolean.class)).isTrue();
        var contracts = mock(IOrganizerContractRepository.class);
        when(contracts.findByProfileId(10L)).thenReturn(Optional.empty());
        var owner = new UserModel(); owner.setEmail("owner@example.test");
        var reviewer = new UserModel(); reviewer.setId(1L); reviewer.setUserName("reviewer-test");
        var profile = new OrganizerProfileModel(); profile.setId(10L); profile.setOrganizer(owner);
        profile.setLegalName("Organizer test"); profile.setRepresentativeName("Test representative");
        profile.setReviewedBy(reviewer); profile.setReviewedAt(LocalDateTime.parse("2026-11-20T01:00:00"));
        var files = new OrganizerContractFiles(directory.toString());
        var service = new OrganizerContractService(contracts, null, null, null, files, new OrganizerContractPdf(),
                null, null, null, Clock.systemUTC(), null, environment,
                environment.getProperty("app.organizer.contract.demo-enabled", Boolean.class, false));
        service.issue(profile);
        var issued = ArgumentCaptor.forClass(OrganizerContractModel.class);
        verify(contracts).saveAndFlush(issued.capture());
        assertThat(issued.getValue().isDemo()).isTrue();
        assertThat(issued.getValue().getTemplateVersion()).isEqualTo("LOCAL-DEMO-2");
        var artifact = files.read(issued.getValue().getOriginalPdfKey());
        try (var pdf = org.apache.pdfbox.Loader.loadPDF(artifact)) {
            assertThat(pdf.getNumberOfPages()).isPositive();
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(pdf)).contains("Organizer test");
        }
    }

    @Test void explicitLocalOptOutRemainsAvailable() throws Exception {
        var environment = defaults("local").withProperty("ORGANIZER_CONTRACT_DEMO_ENABLED", "false");
        assertThat(environment.getProperty("app.organizer.contract.demo-enabled", Boolean.class)).isFalse();
    }

    @Test void productionNeverInheritsLocalAgreementDefaultsEvenWithBothProfilesActive() throws Exception {
        for (var profile : new String[] {"prod", "production"}) {
            var environment = defaults("local", profile);
            assertThat(environment.getProperty("app.organizer.contract.demo-enabled", Boolean.class)).isFalse();
            var service = new OrganizerContractService(null, null, null, null, null, null, null,
                    null, null, Clock.systemUTC(), null, environment, true);
            assertThatThrownBy(() -> service.issue(new OrganizerProfileModel()))
                    .isInstanceOf(ConflictException.class);
        }
    }
}
