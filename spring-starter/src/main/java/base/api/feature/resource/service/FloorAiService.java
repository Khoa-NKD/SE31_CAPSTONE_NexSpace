package base.api.feature.resource.service;

import base.api.feature.resource.dto.*;
import base.api.shared.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** Proposals are short-lived server-held drafts. A restart expires them, never recreates resources. */
@Service
@RequiredArgsConstructor
public class FloorAiService {
    private final FloorDesignService design;
    private final GeminiFloorDesigner gemini;
    private final OrganizerResourceService resources;
    private final ObjectMapper mapper;
    private final TransactionTemplate transaction;
    private final Map<String, Draft> drafts = new LinkedHashMap<>();
    private final Map<Long, ArrayDeque<Instant>> requests = new HashMap<>();
    private final Set<Long> generating = new HashSet<>();
    private record Snapshot(ResourceResponses.FloorLayout layout, List<ResourceResponses.Detail> resources,
            ResourceResponses.Options options, FloorDesign.Metrics metrics, List<FloorDesign.Template> library) {}
    private static final class Draft {
        final Long actor, workspace, floor;
        final Snapshot before;
        final FloorDesign.Propose request;
        final FloorDesign.Proposal proposal;
        ResourceResponses.FloorLayout applied;
        Boolean savedTemplates;
        boolean confirmedTypes;
        FloorDesign.Design appliedDesign;
        Draft(Long actor, Long workspace, Long floor, Snapshot before, FloorDesign.Propose request, FloorDesign.Proposal proposal) {
            this.actor=actor; this.workspace=workspace; this.floor=floor; this.before=before; this.request=request; this.proposal=proposal;
        }
    }
    public FloorDesign.Status status(Long actor, Long workspace, Long floor) {
        transaction.execute(s -> design.owned(actor, workspace, floor, false));
        return gemini.statusWithModels();
    }
    private Snapshot snapshot(Long actor, Long workspace, Long floor) {
        var layout = resources.floorLayout(actor, workspace, floor);
        return new Snapshot(layout, layout.resources().stream().sorted(Comparator.comparing(ResourceResponses.LayoutItem::id)).map(r -> resources.detail(actor, r.id())).toList(),
                resources.options(actor, workspace), design.metrics(actor, workspace, floor), design.library(actor));
    }
    public FloorDesign.Proposal propose(Long actor, Long workspace, Long floor, FloorDesign.Propose request) {
        var before = transaction.execute(s -> { design.owned(actor, workspace, floor, true); return snapshot(actor, workspace, floor); });
        if (!before.layout().editableLayout() || before.layout().width() == null || before.layout().height() == null
                || before.metrics().widthM() == null || before.metrics().lengthM() == null)
            throw new ConflictException("Confirm the physical floor dimensions in meters before using AI");
        if (!before.layout().floor().revision().equals(request.expectedRevision())) throw new ConflictException("The floor changed. Refresh first");
        if (!gemini.status().configured()) throw new ConflictException("Gemini is not configured. Add the API key to Backend Local first");
        FloorDesign.Design previous = null;
        List<String> previousIssues = List.of();
        if (request.previousProposalId() != null) {
            var old = lookup(actor, workspace, floor, request.previousProposalId());
            if (!fingerprint(old.before).equals(fingerprint(before))) throw new ConflictException("The floor changed. Start a fresh proposal");
            if (old.applied != null) throw new ConflictException("This proposal was already saved. Start a new request");
            previous = old.proposal.design();
            previousIssues = old.proposal.issues();
        }
        if (request.draft() != null) {
            if (request.previousProposalId() == null) throw new BadRequestException("A manual draft must reference a previous proposal");
            FloorAiValidation.validatePreview(request.draft(), before.layout(), before.resources(), before.options(), request, before.metrics());
            previous = request.draft();
        }
        begin(actor);
        try {
            var image = FloorDesignImage.normalize(request.image());
            var context = new LinkedHashMap<String,Object>();
            context.put("prompt", request.prompt()); context.put("language", request.language() == null ? "vi" : request.language());
            context.put("scope", request.scope()); context.put("selectedKey", request.selectedKey());
            context.put("canvas", Map.of("width", before.layout().width(), "height", before.layout().height()));
            context.put("metrics", before.metrics()); context.put("resources", before.resources());
            context.put("decorations", before.layout().decorations());
            var activeTypes = before.options().types().stream().filter(ResourceResponses.TypeOption::active).toList();
            var reusableTypes = activeTypes.stream()
                    .filter(type -> type.currency() != null && FloorAiValidation.hasConfirmedConfiguration(type))
                    .toList();
            context.put("resourceTypes", reusableTypes);
            var footprints = new LinkedHashMap<Long, Map<String, java.math.BigDecimal>>();
            for (var type : reusableTypes) {
                var width = type.standardWidthM().multiply(before.layout().width())
                        .divide(before.metrics().widthM(), 2, java.math.RoundingMode.HALF_UP);
                var height = type.standardLengthM().multiply(before.layout().height())
                        .divide(before.metrics().lengthM(), 2, java.math.RoundingMode.HALF_UP);
                footprints.put(type.id(), Map.of("width", width, "height", height));
            }
            context.put("resourceTypeFootprintsPx", footprints);
            context.put("unconfiguredResourceTypeNames", activeTypes.stream()
                    .filter(type -> !reusableTypes.contains(type)).map(ResourceResponses.TypeOption::name).toList());
            context.put("iconCatalog", java.util.List.of(java.util.Map.of("icon", "LOCKER", "meaning", "Locker / cabinet"), java.util.Map.of("icon", "SOFA", "meaning", "Sofa"), java.util.Map.of("icon", "SHELF", "meaning", "Shelf"), java.util.Map.of("icon", "PRINTER", "meaning", "Printer"), java.util.Map.of("icon", "SCREEN", "meaning", "TV / screen"), java.util.Map.of("icon", "COFFEE", "meaning", "Coffee machine"), java.util.Map.of("icon", "WHITEBOARD", "meaning", "Whiteboard"), java.util.Map.of("icon", "LAMP", "meaning", "Lamp"), java.util.Map.of("icon", "FAN", "meaning", "Fan"), java.util.Map.of("icon", "AIR_CONDITIONER", "meaning", "Air conditioner"), java.util.Map.of("icon", "TRASH", "meaning", "Trash bin"), java.util.Map.of("icon", "SPEAKER", "meaning", "Speaker"), java.util.Map.of("icon", "CLOCK", "meaning", "Clock"), java.util.Map.of("icon", "REFRIGERATOR", "meaning", "Refrigerator"), java.util.Map.of("icon", "WATER_DISPENSER", "meaning", "Water dispenser"), java.util.Map.of("icon", "ROUTER", "meaning", "Router"), java.util.Map.of("icon", "TOILET", "meaning", "Toilet"), java.util.Map.of("icon", "SINK", "meaning", "Washbasin"), java.util.Map.of("icon", "PROJECTOR", "meaning", "Projector"), java.util.Map.of("icon", "VIDEO_CONFERENCE", "meaning", "Conference equipment"), java.util.Map.of("icon", "STAIRS", "meaning", "Stairs"), java.util.Map.of("icon", "ELEVATOR", "meaning", "Elevator"), java.util.Map.of("icon", "FIRE_EXTINGUISHER", "meaning", "Fire extinguisher"), java.util.Map.of("icon", "DOOR", "meaning", "Door"), java.util.Map.of("icon", "ACCESSIBILITY", "meaning", "Wheelchair access"), java.util.Map.of("icon", "MICROWAVE", "meaning", "Microwave"), java.util.Map.of("icon", "SHOWER", "meaning", "Shower"), java.util.Map.of("icon", "BED", "meaning", "Bed"), java.util.Map.of("icon", "CAMERA", "meaning", "Camera"), java.util.Map.of("icon", "PHONE", "meaning", "Telephone")));
            context.put("library", before.library().stream().filter(FloorDesign.Template::active).toList());
            context.put("previousDraft", previous);
            if (!previousIssues.isEmpty()) context.put("previousDraftIssues", previousIssues);
            var result = request.model() != null ? gemini.design(context, image, request.model())
                    : image == null ? gemini.design(context) : gemini.design(context, image);
            var issues = new ArrayList<String>();
            boolean question = result.question() != null && !result.question().isBlank();
            if (!question) {
                try { FloorAiValidation.validatePreview(result, before.layout(), before.resources(), before.options(), request, before.metrics()); }
                catch (BadRequestException | ConflictException e) { issues.add(e.getMessage()); }
            }
            boolean changed = !result.resources().isEmpty() || !result.removeResourceIds().isEmpty()
                    || !result.decorations().equals(before.layout().decorations()) || !result.templates().isEmpty() || !result.newTypes().isEmpty();
            var id = UUID.randomUUID().toString();
            var proposal = new FloorDesign.Proposal(id, Instant.now().plusSeconds(1800).toString(), request.expectedRevision(),
                    request.scope(), result, List.copyOf(issues), !question && changed && issues.isEmpty());
            synchronized (drafts) { prune(); drafts.put(id, new Draft(actor,workspace,floor,before,request.withoutImage(),proposal)); }
            return proposal;
        } finally { synchronized (drafts) { generating.remove(actor); } }
    }

    public ResourceResponses.FloorLayout apply(Long actor, Long workspace, Long floorId, FloorDesign.Apply input) {
        var draft = lookup(actor, workspace, floorId, input.proposalId());
        synchronized (draft) {
            var submitted = input.design() == null ? draft.proposal.design() : input.design();
            // Recheck authorization even for an idempotent replay.
            transaction.execute(s -> design.owned(actor, workspace, floorId, true));
            if (draft.applied != null) {
                if (!Objects.equals(draft.savedTemplates, input.saveTemplates()) || draft.confirmedTypes != input.confirmNewTypes() || !Objects.equals(draft.appliedDesign, submitted)) throw new ConflictException("This proposal was already applied with different options");
                return draft.applied;
            }
            if (!draft.proposal.applicable() && input.design() == null) throw new ConflictException("Resolve the proposal issues before applying it");
            var result = transaction.execute(status -> {
                design.owned(actor, workspace, floorId, true);
                var current = snapshot(actor, workspace, floorId);
                if (!fingerprint(current).equals(fingerprint(draft.before))) throw new ConflictException("The floor, dimensions or resource types changed. Generate a fresh proposal");
                var plan = submitted;
                FloorAiValidation.validate(plan, current.layout(), current.resources(), current.options(), draft.request, current.metrics());
                if (!plan.newTypes().isEmpty()) {
                    if (!input.confirmNewTypes()) throw new BadRequestException("Confirm new resource types and their prices before applying");
                    var typeIds = new HashMap<Long, Long>();
                    for (var type : plan.newTypes()) {
                        if (type.pricePerHour() == null && type.pricePerDay() == null && type.pricePerMonth() == null)
                            throw new BadRequestException("Enter at least one base price for every new resource type");
                        var created = resources.createType(actor, workspace, new ResourceRequests.Type(type.name(), type.category(), type.currency(), type.capacity(), type.pricePerHour(), type.pricePerDay(), type.pricePerMonth(), null, false, type.usageKind(), type.standardWidthM(), type.standardLengthM()));
                        typeIds.put(type.tempId(), created.id());
                    }
                    plan = new FloorDesign.Design(plan.message(), plan.question(), plan.resources().stream().map(r ->
                        new FloorDesign.ResourceChange(r.key(), r.id(), typeIds.getOrDefault(r.resourceTypeId(), r.resourceTypeId()), r.name(), r.parentKey(), r.capacity(), r.posX(), r.posY(), r.width(), r.height(), r.rotation(), r.usageKind())).toList(),
                        plan.removeResourceIds(), plan.decorations(), plan.templates());
                }
                resources.saveAiDesign(actor, workspace, floorId, current.layout().floor().revision(), plan);
                if (input.saveTemplates()) for (var template : plan.templates()) design.saveTemplate(actor, null, template);
                // Return the persisted snapshot, including database IDs for all AI-created resources.
                return resources.floorLayout(actor, workspace, floorId);
            });
            draft.savedTemplates = input.saveTemplates(); draft.confirmedTypes = input.confirmNewTypes(); draft.appliedDesign = submitted; draft.applied = result; return result;
        }
    }
    private Draft lookup(Long actor, Long workspace, Long floor, String id) {
        synchronized (drafts) {
            prune(); var value = drafts.get(id);
            if (value == null || !value.actor.equals(actor) || !value.workspace.equals(workspace) || !value.floor.equals(floor))
                throw new NotFoundException("Proposal expired or unavailable. Generate a new proposal");
            return value;
        }
    }
    private void begin(Long actor) {
        synchronized (drafts) {
            prune(); var now = Instant.now();
            var history = requests.computeIfAbsent(actor, k -> new ArrayDeque<>());
            while (!history.isEmpty() && history.peekFirst().isBefore(now.minusSeconds(3600))) history.removeFirst();
            long minute = history.stream().filter(t -> t.isAfter(now.minusSeconds(60))).count();
            if (generating.contains(actor) || minute >= 5 || history.size() >= 50 || drafts.size() + generating.size() >= 500)
                throw new ConflictException("AI request limit reached. Wait before trying again");
            history.addLast(now); generating.add(actor);
        }
    }
    private void prune() {
        var now = Instant.now();
        drafts.entrySet().removeIf(e -> Instant.parse(e.getValue().proposal.expiresAt()).isBefore(now));
        requests.entrySet().removeIf(e -> !generating.contains(e.getKey()) && (e.getValue().isEmpty() || e.getValue().peekLast().isBefore(now.minusSeconds(3600))));
    }
    private String fingerprint(Snapshot value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsString(value).getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException("Could not compare design revisions"); }
    }
}
