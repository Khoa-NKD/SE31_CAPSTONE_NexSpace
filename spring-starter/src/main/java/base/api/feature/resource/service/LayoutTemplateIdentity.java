package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDecorations;
import java.text.Normalizer;
import java.util.Locale;

/** Copy labels and presentation icons do not create a new reusable furnishing type. */
final class LayoutTemplateIdentity {
    private LayoutTemplateIdentity() {}

    static String key(FloorDecorations.Kind kind, String label) {
        String name = Normalizer.normalize(label, Normalizer.Form.NFD)
                .replaceAll("[\\u0300-\\u036f]", "")
                .toLowerCase(Locale.ROOT).replace('đ', 'd').trim();
        if (java.util.regex.Pattern.compile("\\b(tv|tivi|television)\\b").matcher(name).find())
            return kind + ":TV";
        String type = name.replaceAll("(?:\\s*\\((?:ban sao|copy)(?:\\s+\\d+)?\\)\\s*)+$", "")
                .replaceAll("\\s*(?:[-–—·]\\s*)?\\b(?:room|phong|floor|tang|khu vuc)\\b.*$", "")
                .replaceAll("\\s+\\d+$", "").replaceAll("\\s+", " ").trim();
        return kind + ":" + (type.isEmpty() ? name : type);
    }
}
