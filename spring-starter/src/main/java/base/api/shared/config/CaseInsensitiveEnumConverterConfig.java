package base.api.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cho phép bind enum ở query/path param không phân biệt hoa thường (vd. ?role=admin).
 */
@Configuration
public class CaseInsensitiveEnumConverterConfig implements WebMvcConfigurer {

    @Override
    @SuppressWarnings({"rawtypes", "unchecked"})
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverterFactory(new ConverterFactory<String, Enum>() {
            @Override
            public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
                return source -> {
                    if (source == null || source.isBlank()) {
                        return null;
                    }
                    String normalized = source.trim().replace('-', '_').toUpperCase();
                    return (T) Enum.valueOf(targetType, normalized);
                };
            }
        });
    }
}
