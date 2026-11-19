package base.api.feature.resource.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.constraints.*;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/** Keep the provider schema structural; validate domain constraints after decoding. */
final class AiDesignSchema {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private AiDesignSchema() {}

    static ObjectNode schema(Type type) {
        ObjectNode node = MAPPER.createObjectNode();
        if (type instanceof ParameterizedType parameter && parameter.getRawType() == List.class) {
            node.put("type", "array");
            node.set("items", schema(parameter.getActualTypeArguments()[0]));
        } else {
            Class<?> cls = (Class<?>) type;
            if (cls.isRecord()) {
                node.put("type", "object"); node.put("additionalProperties", false);
                var properties = node.putObject("properties"); var required = node.putArray("required");
                for (var field : cls.getRecordComponents()) {
                    var child = schema(field.getGenericType());
                    boolean nonNull = field.getType().isPrimitive() || Stream.concat(
                            Stream.of(field.getAccessor().getAnnotations()),
                            Stream.of(field.getAnnotatedType().getAnnotations()))
                            .anyMatch(a -> a instanceof NotNull || a instanceof NotBlank || a instanceof NotEmpty);
                    if (!nonNull) {
                        var nullable = MAPPER.createObjectNode();
                        var alternatives = nullable.putArray("anyOf");
                        alternatives.add(child); alternatives.addObject().put("type", "null"); child = nullable;
                    }
                    properties.set(field.getName(), child); required.add(field.getName());
                }
            } else if (cls.isEnum()) {
                node.put("type", "string"); var values = node.putArray("enum");
                for (var value : cls.getEnumConstants()) values.add(value.toString());
            } else {
                node.put("type", cls == String.class ? "string" : cls == boolean.class || cls == Boolean.class
                        ? "boolean" : Set.of(Long.class, Integer.class, long.class, int.class).contains(cls) ? "integer" : "number");
            }
        }
        return node;
    }
}
