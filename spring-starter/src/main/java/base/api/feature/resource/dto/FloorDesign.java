package base.api.feature.resource.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import base.api.feature.resource.dto.FloorDecorations.Item;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ResourceCurrency;
import base.api.shared.enums.ResourceUsageKind;

/** AI output is an untrusted proposal, never a command to bypass resource business rules. */
public final class FloorDesign {
    private FloorDesign() {}
    public record MetricsInput(
            @NotBlank @Size(max = 100) String expectedRevision,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal widthM,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal lengthM,
            @Min(1) @Max(100000) Integer maxOccupancy,
            @Min(1) @Max(100000) Integer occupancyLimit) {}
    public record Metrics(String revision, BigDecimal physicalWidthM, BigDecimal physicalLengthM,
            BigDecimal widthM, BigDecimal lengthM, BigDecimal areaSqm, Integer maxOccupancy,
            Integer occupancyLimit, int designOccupancy, BigDecimal workspaceDeclaredAreaSqm,
            BigDecimal workspaceMappedAreaSqm, boolean allAreasMeasured) {}
    public record TemplateInput(
            @NotBlank @Size(max = 100) String name, @NotNull FloorDecorations.Kind kind,
            @NotNull @DecimalMin("0.01") @DecimalMax("1000") @Digits(integer = 4, fraction = 2) BigDecimal widthM,
            @NotNull @DecimalMin("0.01") @DecimalMax("1000") @Digits(integer = 4, fraction = 2) BigDecimal lengthM,
            @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String color,
            @Size(max = 100) String expectedRevision, FloorDecorations.Icon icon) {
        public TemplateInput(String name, FloorDecorations.Kind kind, BigDecimal widthM, BigDecimal lengthM, String color, String expectedRevision) {
            this(name, kind, widthM, lengthM, color, expectedRevision, null);
        }
    }
    public record Template(Long id, String name, FloorDecorations.Kind kind, BigDecimal widthM,
            BigDecimal lengthM, String color, boolean active, String revision, FloorDecorations.Icon icon) {}
    public enum Scope { WORKSPACE, ROOM, OBJECT }
    /** Images are request-scoped input and are never retained with cached proposals. */
    public record ImageInput(@NotBlank @Pattern(regexp = "image/(jpeg|png)") String mimeType,
            @NotBlank @Size(max = 6990508) String base64) {}
    public record Propose(
            @NotBlank @Size(max = 4000) String prompt,
            @NotBlank @Size(max = 100) String expectedRevision,
            @NotNull Scope scope,
            @Size(max = 80) String selectedKey,
            @Pattern(regexp = "vi|en") String language,
            @Pattern(regexp = "[a-f0-9-]{36}") String previousProposalId,
            @Valid Design draft, @Valid ImageInput image,
            @Pattern(regexp = "gemini-[a-z0-9._-]{1,92}") String model) {
        public Propose(String prompt, String expectedRevision, Scope scope, String selectedKey, String language, String previousProposalId) {
            this(prompt, expectedRevision, scope, selectedKey, language, previousProposalId, null, null, null);
        }
        public Propose(String prompt, String expectedRevision, Scope scope, String selectedKey, String language, String previousProposalId, Design draft) {
            this(prompt, expectedRevision, scope, selectedKey, language, previousProposalId, draft, null, null);
        }
        public Propose(String prompt, String expectedRevision, Scope scope, String selectedKey, String language, String previousProposalId, Design draft, ImageInput image) {
            this(prompt, expectedRevision, scope, selectedKey, language, previousProposalId, draft, image, null);
        }
        public Propose withoutImage() { return new Propose(prompt, expectedRevision, scope, selectedKey, language, previousProposalId, draft, null, model); }
    }
    public record Apply(@NotBlank @Pattern(regexp = "[a-f0-9-]{36}") String proposalId,
                        @NotNull Boolean saveTemplates, @Valid Design design, boolean confirmNewTypes) {
        public Apply(String proposalId, Boolean saveTemplates) { this(proposalId, saveTemplates, null, false); }
        public Apply(String proposalId, Boolean saveTemplates, Design design) { this(proposalId, saveTemplates, design, false); }
    }
    public record ResourceChange(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,64}") String key,
            @Positive Long id, @NotNull Long resourceTypeId,
            @NotBlank @Size(max = 150) String name,
            @Size(max = 64) String parentKey,
            @Min(1) @Max(10000) Integer capacity,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal posX,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal posY,
            @NotNull @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal width,
            @NotNull @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal height,
            @NotNull @DecimalMin("0") @DecimalMax("359.99") @Digits(integer = 3, fraction = 2) BigDecimal rotation, ResourceUsageKind usageKind) {
        public ResourceChange(String key, Long id, Long resourceTypeId, String name, String parentKey, Integer capacity,
                BigDecimal posX, BigDecimal posY, BigDecimal width, BigDecimal height, BigDecimal rotation) {
            this(key, id, resourceTypeId, name, parentKey, capacity, posX, posY, width, height, rotation, null);
        }
    }
    /** Negative IDs only link proposed types within a draft; persistence allocates positive IDs. */
    public record NewType(
            @NotNull @Max(-1) @Min(-20) Long tempId,
            @NotBlank @Size(max = 100) String name,
            @NotNull ResourceCategory category,
            @NotNull ResourceCurrency currency,
            @Min(1) @Max(10000) int capacity,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerHour,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerDay,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerMonth,
            @NotNull ResourceUsageKind usageKind,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal standardWidthM,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal standardLengthM) {
        public NewType(Long tempId, String name, ResourceCategory category, ResourceCurrency currency, int capacity,
                BigDecimal pricePerHour, BigDecimal pricePerDay, BigDecimal pricePerMonth) {
            this(tempId, name, category, currency, capacity, pricePerHour, pricePerDay, pricePerMonth, null, null, null);
        }
    }
    public record Design(
            @NotBlank @Size(max = 2000) String message,
            @Size(max = 1000) String question,
            @NotNull @Size(max = 100) List<@NotNull @Valid ResourceChange> resources,
            @NotNull @Size(max = 100) List<@NotNull @Positive Long> removeResourceIds,
            @NotNull @Size(max = 500) List<@NotNull @Valid Item> decorations,
            @NotNull @Size(max = 20) List<@NotNull @Valid TemplateInput> templates,
            @Size(max = 20) List<@NotNull @Valid NewType> newTypes) {
        public Design { newTypes = newTypes == null ? List.of() : List.copyOf(newTypes); }
        public Design(String message, String question, List<ResourceChange> resources, List<Long> removeResourceIds, List<Item> decorations, List<TemplateInput> templates) {
            this(message, question, resources, removeResourceIds, decorations, templates, List.of());
        }
    }
    public record Proposal(String proposalId, String expiresAt, String expectedRevision, Scope scope,
            Design design, List<String> issues, boolean applicable) {}
    public enum ModelAvailability { AVAILABLE, RETIRED, UNAVAILABLE }
    public record ModelOption(String id, String displayName, ModelAvailability availability, String shutdownDate) {}
    public record Status(boolean configured, String model, List<ModelOption> models) {
        public Status(boolean configured, String model) { this(configured, model, List.of()); }
    }
}
