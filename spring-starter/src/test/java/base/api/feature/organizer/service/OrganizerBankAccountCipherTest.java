package base.api.feature.organizer.service;

import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrganizerBankAccountCipherTest {
    private final OrganizerBankAccountCipher cipher = new OrganizerBankAccountCipher(
            Base64.getEncoder().encodeToString(new byte[32]));

    @Test
    void encryptsWithFreshNoncesAndBindsToOwnerProfile() {
        String first = cipher.encrypt(42L, "001234567890");
        assertThat(cipher.lastFour(42L, first)).isEqualTo("7890");
        assertThat(cipher.encrypt(42L, "001234567890")).isNotEqualTo(first);
        assertThat(cipher.lastFour(43L, first)).isNull();
        assertThat(cipher.lastFour(42L, first + "tampered")).isNull();
        assertThat(cipher.lastFour(42L, "legacy-value")).isNull();
        assertThat(cipher.lastFour(42L, "bank:v1:bad:bad")).isNull();
        var otherKey = new byte[32];
        otherKey[0] = 1;
        assertThat(new OrganizerBankAccountCipher(Base64.getEncoder().encodeToString(otherKey)).lastFour(42L, first)).isNull();
    }

    @Test
    void failsClosedWithoutValidKey() {
        for (String key : new String[]{"", "invalid", "YWJj"}) {
            var disabled = new OrganizerBankAccountCipher(key);
            assertThat(disabled.isConfigured()).isFalse();
            assertThatThrownBy(() -> disabled.encrypt(42L, "123456"))
                    .isInstanceOf(base.api.shared.exception.ConflictException.class);
        }
    }
}
