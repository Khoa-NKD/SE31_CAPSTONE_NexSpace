package base.api.feature.organizer.service;

public final class OrganizerIdentityCheckUnavailableException extends RuntimeException {
    public OrganizerIdentityCheckUnavailableException() {
        super("Identity photo checking is temporarily unavailable. Try again.");
    }
}
