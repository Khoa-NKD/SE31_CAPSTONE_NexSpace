package base.api.feature.organizer.service;

import java.util.Map;

/** Field errors from validating the persisted draft at the submission boundary. */
public class OrganizerApplicationValidationException extends RuntimeException {
    private final Map<String, String> errors;

    public OrganizerApplicationValidationException(Map<String, String> errors) {
        super("Complete the required business details and verification documents before submitting");
        this.errors = Map.copyOf(errors);
    }

    public Map<String, String> getErrors() { return errors; }
}
