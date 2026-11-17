package base.api.feature.organizer.service;

import base.api.shared.exception.ConflictException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/** Encrypts bank numbers using a separate deployment key, bound to their owning profile. */
@Component
public class OrganizerBankAccountCipher {
    private static final String PREFIX = "bank:v1:";
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public OrganizerBankAccountCipher(@Value("${app.organizer.bank.encryption-key:}") String configuredKey) {
        SecretKeySpec parsed = null;
        try {
            byte[] bytes = Base64.getDecoder().decode(configuredKey.trim());
            if (bytes.length == 32) parsed = new SecretKeySpec(bytes, "AES");
        } catch (IllegalArgumentException ignored) {
            // Invalid configuration disables banking edits without affecting contact updates.
        }
        key = parsed;
    }

    public boolean isConfigured() { return key != null; }

    public String encrypt(Long profileId, String number) {
        if (!isConfigured()) throw new ConflictException("Bank account updates are temporarily unavailable");
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            return PREFIX + Base64.getEncoder().encodeToString(iv) + ":"
                    + Base64.getEncoder().encodeToString(cipher(Cipher.ENCRYPT_MODE, profileId, iv)
                    .doFinal(number.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException ex) {
            throw new ConflictException("Bank account updates are temporarily unavailable");
        }
    }

    /** Unreadable legacy or tampered values are never exposed as account digits. */
    public String lastFour(Long profileId, String stored) {
        if (!isConfigured() || stored == null || !stored.startsWith(PREFIX)) return null;
        try {
            String[] parts = stored.substring(PREFIX.length()).split(":", -1);
            if (parts.length != 2) return null;
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            if (iv.length != 12) return null;
            String number = new String(cipher(Cipher.DECRYPT_MODE, profileId, iv)
                    .doFinal(Base64.getDecoder().decode(parts[1])), StandardCharsets.UTF_8);
            return number.matches("[0-9]{6,34}") ? number.substring(number.length() - 4) : null;
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            return null;
        }
    }

    private Cipher cipher(int mode, Long profileId, byte[] iv) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, key, new GCMParameterSpec(128, iv));
        cipher.updateAAD(("organizer-profile:" + profileId).getBytes(StandardCharsets.UTF_8));
        return cipher;
    }
}
