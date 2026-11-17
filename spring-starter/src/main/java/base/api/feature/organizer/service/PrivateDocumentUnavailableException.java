package base.api.feature.organizer.service;

/** Sanitized storage failure; never retains a provider exception, signed URL or local path. */
public class PrivateDocumentUnavailableException extends RuntimeException {
    public PrivateDocumentUnavailableException() {
        super("Verification document is temporarily unavailable. Please try again later");
    }
}
