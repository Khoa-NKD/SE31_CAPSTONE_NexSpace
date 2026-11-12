package base.api.feature.organizer.service;

import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.exception.ConflictException;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.assertj.core.api.Assertions.*;

class OrganizerContractTemplateGateTest {
    @Test void productionAndUnconfiguredLocalCannotIssueDemoAgreements() {
        var production = new MockEnvironment(); production.setActiveProfiles("prod");
        var local = new MockEnvironment(); local.setActiveProfiles("local");
        for (var environment : java.util.List.of(production, local)) {
            boolean enabled = environment == production;
            var service = new OrganizerContractService(null, null, null, null, null, null, null,
                    null, null, Clock.systemUTC(), null, environment, enabled);
            assertThatThrownBy(() -> service.issue(new OrganizerProfileModel())).isInstanceOf(ConflictException.class)
                    .hasMessageContaining("approved production agreement template");
        }
    }
}
