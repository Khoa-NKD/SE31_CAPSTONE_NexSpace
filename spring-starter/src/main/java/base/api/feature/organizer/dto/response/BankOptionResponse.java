package base.api.feature.organizer.dto.response;

/** Public provider metadata, independent of organizer account details. */
public record BankOptionResponse(String code, String bin, String name, String shortName, String logo) { }
