package base.api.feature.organizer.service;

import base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest;
import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.shared.enums.BusinessType;
import jakarta.validation.Validation;
import jakarta.validation.groups.Default;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class OrganizerRegistrationReasonValidationTest {
    SubmitOrganizerApplicationRequest submission(String reason) {
        return new SubmitOrganizerApplicationRequest("Company",BusinessType.LIMITED_LIABILITY,"0400000123","Representative","12 Test Street","0900000123","contact@example.test",reason);
    }
    @Test void reasonIsOptionalForDraftAndLegacyReviewButRequiredForExplicitSubmission() {
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            for(String reason:new String[]{null,"","   "}) {
                assertThat(validator.validate(new SaveOrganizerDraftRequest(null,null,null,null,null,null,null,reason))).isEmpty();
                assertThat(validator.validate(submission(reason))).isEmpty();
                assertThat(validator.validate(submission(reason),Default.class,SubmitOrganizerApplicationRequest.Submission.class))
                        .extracting(violation -> violation.getPropertyPath().toString()).containsExactly("registrationReason");
            }
        }
    }
    @Test void reasonIsTrimmedAndBoundedForBothDraftsAndSubmissions() {
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            assertThat(submission("  First line\nSecond line  ").registrationReason()).isEqualTo("First line\nSecond line");
            assertThat(validator.validate(submission("x".repeat(2000)),Default.class,SubmitOrganizerApplicationRequest.Submission.class)).isEmpty();
            assertThat(validator.validate(submission("x".repeat(2001)))).extracting(violation -> violation.getPropertyPath().toString()).containsExactly("registrationReason");
            assertThat(validator.validate(new SaveOrganizerDraftRequest(null,null,null,null,null,null,null,"x".repeat(2001))))
                    .extracting(violation -> violation.getPropertyPath().toString()).containsExactly("registrationReason");
        }
    }
}
