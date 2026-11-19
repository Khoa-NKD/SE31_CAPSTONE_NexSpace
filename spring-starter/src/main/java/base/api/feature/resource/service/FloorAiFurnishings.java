package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDecorations;
import base.api.feature.resource.dto.FloorDesign;
import java.text.Normalizer;
import java.util.*;

/** Correct unmistakable new furniture before type configuration; persisted seats/rooms are never retyped. */
final class FloorAiFurnishings {
    private FloorAiFurnishings() {}

    static FloorDesign.Design normalize(FloorDesign.Design proposal) {
        var furniture = new LinkedHashMap<String, FloorDecorations.Icon>();
        for (var resource : proposal.resources()) {
            if (resource.id() != null) continue;
            var icon = classify(resource.name());
            if (icon != null) furniture.put(resource.key(), icon);
        }
        if (furniture.isEmpty()) return withTemplateVisuals(proposal);
        var objects = new ArrayList<>(proposal.decorations());
        var ids = new HashSet<String>();
        objects.forEach(item -> ids.add(item.id()));
        var changes = new ArrayList<FloorDesign.ResourceChange>();
        var convertedTypes = new HashSet<Long>();
        var byKey = new HashMap<String, FloorDesign.ResourceChange>();
        proposal.resources().forEach(item -> byKey.put(item.key(), item));
        for (var resource : proposal.resources()) {
            var icon = furniture.get(resource.key());
            if (icon != null) {
                convertedTypes.add(resource.resourceTypeId());
                String stem = "f_" + resource.key().substring(0, Math.min(resource.key().length(), 54));
                String id = stem;
                for (int suffix = 2; !ids.add(id); suffix++) id = stem + "_" + suffix;
                var kind = icon == FloorDecorations.Icon.TABLE ? FloorDecorations.Kind.TABLE
                        : icon == FloorDecorations.Icon.PLANT ? FloorDecorations.Kind.PLANT
                        : icon == FloorDecorations.Icon.PARTITION ? FloorDecorations.Kind.PARTITION : FloorDecorations.Kind.OTHER;
                objects.add(new FloorDecorations.Item(id, kind, resource.name().substring(0, Math.min(100, resource.name().length())),
                        resource.posX(), resource.posY(), resource.width(), resource.height(), resource.rotation(), "#8793a7", icon,
                        proposal.newTypes().stream().filter(type -> type.tempId().equals(resource.resourceTypeId()))
                                .map(FloorDesign.NewType::visual3d).filter(Objects::nonNull).findFirst().orElse(null)));
            } else {
                String parent = resource.parentKey();
                var visited = new HashSet<String>();
                while (parent != null && furniture.containsKey(parent) && visited.add(parent)) parent = byKey.get(parent).parentKey();
                if (parent != null && furniture.containsKey(parent)) parent = null;
                changes.add(new FloorDesign.ResourceChange(resource.key(), resource.id(), resource.resourceTypeId(), resource.name(), parent,
                        resource.capacity(), resource.posX(), resource.posY(), resource.width(), resource.height(), resource.rotation(), resource.usageKind()));
            }
        }
        var types = proposal.newTypes().stream().filter(type -> !convertedTypes.contains(type.tempId())
                || changes.stream().anyMatch(item -> type.tempId().equals(item.resourceTypeId()))).toList();
        return withTemplateVisuals(new FloorDesign.Design(proposal.message(), proposal.question(), changes, proposal.removeResourceIds(), objects, proposal.templates(), types));
    }

    /** A reusable preset and its placed copy share the same normalized design, not a pixel-sized mesh. */
    private static FloorDesign.Design withTemplateVisuals(FloorDesign.Design proposal) {
        var templates = proposal.templates().stream().map(template -> {
            var visual = template.visual3d();
            if (visual == null) visual = proposal.decorations().stream()
                    .filter(item -> item.kind() == template.kind() && item.label().trim().equalsIgnoreCase(template.name().trim()))
                    .map(FloorDecorations.Item::visual3d).filter(Objects::nonNull).findFirst().orElse(null);
            return new FloorDesign.TemplateInput(template.name(), template.kind(), template.widthM(), template.lengthM(),
                    template.color(), template.expectedRevision(), template.icon(), visual);
        }).toList();
        var objects = proposal.decorations().stream().map(item -> {
            var visual = item.visual3d();
            if (visual == null) visual = templates.stream()
                    .filter(template -> template.kind() == item.kind() && template.name().trim().equalsIgnoreCase(item.label().trim()))
                    .map(FloorDesign.TemplateInput::visual3d).filter(Objects::nonNull).findFirst().orElse(null);
            return new FloorDecorations.Item(item.id(), item.kind(), item.label(), item.posX(), item.posY(), item.width(),
                    item.height(), item.rotation(), item.color(), item.icon(), visual);
        }).toList();
        return new FloorDesign.Design(proposal.message(), proposal.question(), proposal.resources(), proposal.removeResourceIds(), objects, templates, proposal.newTypes());
    }

    private static FloorDecorations.Icon classify(String label) {
        if (label == null) return null;
        String text = Normalizer.normalize(label, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT).trim();
        text = text.replaceAll("(?<=\\p{L})(?=\\d)", " ");
        // DESK is also the legacy name for bookable seats; explicit seat labels take precedence.
        if (text.matches("^(ghe|cho ngoi|chair|seat|phong|room|desk)\\b.*")
                || text.matches(".*\\bseat\\b.*")) return null;
        if (text.matches("^(ban phim|keyboard|cua so|window)\\b.*")) return FloorDecorations.Icon.BOX;
        if (text.matches("^(ban|table)\\b.*")) return FloorDecorations.Icon.TABLE;
        if (text.matches("^(cua|door|entrance)\\b.*")) return FloorDecorations.Icon.DOOR;
        if (text.matches("^(tivi|ti vi|tv|television|man hinh|screen|monitor)\\b.*")) return FloorDecorations.Icon.SCREEN;
        if (text.matches("^(cay nuoc|water dispenser)\\b.*")) return FloorDecorations.Icon.WATER_DISPENSER;
        if (text.matches("^(cay|plant)\\b.*")) return FloorDecorations.Icon.PLANT;
        if (text.matches("^(tu lanh|fridge|refrigerator)\\b.*")) return FloorDecorations.Icon.REFRIGERATOR;
        if (text.matches("^(tu|locker|cabinet)\\b.*")) return FloorDecorations.Icon.LOCKER;
        if (text.matches("^(ke|shelf|shelving)\\b.*")) return FloorDecorations.Icon.SHELF;
        if (text.matches("^(sofa|couch)\\b.*")) return FloorDecorations.Icon.SOFA;
        if (text.matches("^(vach|partition)\\b.*")) return FloorDecorations.Icon.PARTITION;
        if (text.matches("^(may in|printer)\\b.*")) return FloorDecorations.Icon.PRINTER;
        if (text.matches("^(bang viet|whiteboard)\\b.*")) return FloorDecorations.Icon.WHITEBOARD;
        if (text.matches("^(den|lamp)\\b.*")) return FloorDecorations.Icon.LAMP;
        if (text.matches("^(quat|fan)\\b.*")) return FloorDecorations.Icon.FAN;
        if (text.matches("^(may lanh|dieu hoa|air conditioner)\\b.*")) return FloorDecorations.Icon.AIR_CONDITIONER;
        if (text.matches("^(thung rac|trash)\\b.*")) return FloorDecorations.Icon.TRASH;
        return null;
    }
}
