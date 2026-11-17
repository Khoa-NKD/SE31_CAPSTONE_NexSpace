package base.api.feature.organizer.service;

public class BankCatalogUnavailableException extends RuntimeException {
    public BankCatalogUnavailableException() { super("The bank catalog is temporarily unavailable. Please try again later."); }
}
