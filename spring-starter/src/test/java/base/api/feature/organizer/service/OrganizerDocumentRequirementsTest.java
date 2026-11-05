package base.api.feature.organizer.service;

import base.api.shared.enums.*;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class OrganizerDocumentRequirementsTest {
    private OrganizerDocumentModel document(OrganizerDocumentType type) {
        var document = new OrganizerDocumentModel(); document.setDocumentType(type); document.setFileUrl("private-file-reference");
        return document;
    }
    @ParameterizedTest @EnumSource(BusinessType.class)
    void validatesTheApprovedMatrixForEverySupportedType(BusinessType type) {
        var required = OrganizerDocumentRequirements.requiredTypes(type);
        int expected = switch(type) { case SOLE_PROPRIETOR, HOUSEHOLD_BUSINESS -> 3; case OTHER -> 2; default -> 1; };
        assertThat(required).hasSize(expected).contains(OrganizerDocumentType.BUSINESS_LICENSE).doesNotContain(OrganizerDocumentType.BANK_CERTIFICATE, OrganizerDocumentType.TAX_CERTIFICATE);
        assertThat(OrganizerDocumentRequirements.errors(type, required.stream().map(this::document).toList(), false)).isEmpty();
        assertThat(OrganizerDocumentRequirements.errors(type, List.of(), false)).hasSize(expected);
    }
    @Test void rejectsMissingIdentitySidesRejectedOptionalFilesOldVersionsAndDuplicates() {
        var license = document(OrganizerDocumentType.BUSINESS_LICENSE);
        assertThat(OrganizerDocumentRequirements.errors(BusinessType.HOUSEHOLD_BUSINESS, List.of(license), false)).containsKeys("documents.ID_CARD_FRONT", "documents.ID_CARD_BACK");
        var identity = document(OrganizerDocumentType.ID_CARD_FRONT); identity.setStatus(OrganizerDocumentStatus.REJECTED);
        assertThat(OrganizerDocumentRequirements.errors(BusinessType.LIMITED_LIABILITY, List.of(license, identity), false)).containsKey("documents");
        identity.setCurrent(false);
        assertThat(OrganizerDocumentRequirements.errors(BusinessType.HOUSEHOLD_BUSINESS, List.of(license, identity), false)).containsKey("documents.ID_CARD_FRONT");
        assertThat(OrganizerDocumentRequirements.errors(BusinessType.LIMITED_LIABILITY, List.of(license, license), false)).containsKey("documents");
        assertThat(OrganizerDocumentRequirements.errors(BusinessType.HOUSEHOLD_BUSINESS, List.of(), true)).containsKeys("documents.ID_CARD_FRONT", "documents.ID_CARD_BACK").doesNotContainKey("businessLicense");
    }
}
